"""
Thermal Analysis Backend — Phase 1
STL upload → gmsh mesh → scikit-fem steady-state FEM → JSON result
"""

import io
import tempfile
import os
import traceback
from typing import Optional

import numpy as np
import gmsh
from stl import mesh as stl_mesh
import skfem
from skfem import MeshTet, Basis, ElementTetP1
from skfem.models.poisson import laplace, mass
from scipy.sparse.linalg import spsolve

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Thermal Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- STL → gmsh mesh ----------

def stl_to_mesh(stl_bytes: bytes) -> MeshTet:
    """STL 바이트를 받아 tetrahedral mesh를 반환한다."""
    with tempfile.TemporaryDirectory() as tmpdir:
        stl_path = os.path.join(tmpdir, "model.stl")
        msh_path = os.path.join(tmpdir, "model.msh")

        with open(stl_path, "wb") as f:
            f.write(stl_bytes)

        gmsh.initialize()
        gmsh.option.setNumber("General.Verbosity", 0)
        try:
            gmsh.merge(stl_path)
            # classify surfaces and create volume
            gmsh.model.mesh.classifySurfaces(np.pi, True, True, np.pi)
            gmsh.model.mesh.createGeometry()
            gmsh.model.geo.synchronize()

            # create volume from surfaces
            surfaces = gmsh.model.getEntities(2)
            surface_tags = [s[1] for s in surfaces]
            loop = gmsh.model.geo.addSurfaceLoop(surface_tags)
            gmsh.model.geo.addVolume([loop])
            gmsh.model.geo.synchronize()

            # mesh size control — moderate resolution
            gmsh.option.setNumber("Mesh.CharacteristicLengthFactor", 1.0)
            gmsh.option.setNumber("Mesh.Algorithm3D", 1)  # Delaunay
            gmsh.model.mesh.generate(3)
            gmsh.write(msh_path)
        finally:
            gmsh.finalize()

        fem_mesh = skfem.io.meshio.from_file(msh_path)
    return fem_mesh


# ---------- FEM solver ----------

def solve_steady_state(
    fem_mesh: MeshTet,
    conductivity: float,       # W/(m·K)
    dirichlet_bcs: list[dict], # [{"boundary": "all"|"min_z"|"max_z", "temp": float}]
    heat_source: float = 0.0,  # W/m³ volumetric
) -> dict:
    """
    정상상태 열전도: ∇·(k ∇T) + Q = 0
    반환: {"nodes": [[x,y,z],...], "temperatures": [T,...], "elements": [[i,j,k,l],...]}
    """
    basis = Basis(fem_mesh, ElementTetP1())

    # stiffness matrix K
    K = conductivity * skfem.asm(laplace, basis)
    # load vector f (heat source)
    f = heat_source * skfem.asm(mass, basis) @ np.ones(basis.N)

    # Dirichlet boundary conditions
    dofs_fixed = np.array([], dtype=int)
    vals_fixed = np.array([])

    for bc in dirichlet_bcs:
        boundary = bc.get("boundary", "all")
        temp = float(bc.get("temp", 0.0))

        nodes = fem_mesh.p.T  # (N, 3)

        if boundary == "all":
            idx = fem_mesh.boundary_nodes()
        elif boundary == "min_z":
            zmin = nodes[:, 2].min()
            idx = np.where(np.abs(nodes[:, 2] - zmin) < 1e-10 * (nodes[:, 2].max() - zmin + 1e-12))[0]
        elif boundary == "max_z":
            zmax = nodes[:, 2].max()
            idx = np.where(np.abs(nodes[:, 2] - zmax) < 1e-10 * (nodes[:, 2].max() - nodes[:, 2].min() + 1e-12))[0]
        elif boundary == "min_x":
            xmin = nodes[:, 0].min()
            idx = np.where(np.abs(nodes[:, 0] - xmin) < 1e-10 * (nodes[:, 0].max() - xmin + 1e-12))[0]
        elif boundary == "max_x":
            xmax = nodes[:, 0].max()
            idx = np.where(np.abs(nodes[:, 0] - xmax) < 1e-10 * (nodes[:, 0].max() - nodes[:, 0].min() + 1e-12))[0]
        else:
            idx = fem_mesh.boundary_nodes()

        dofs_fixed = np.concatenate([dofs_fixed, idx])
        vals_fixed = np.concatenate([vals_fixed, np.full(len(idx), temp)])

    # solve with Dirichlet BCs
    K_coo = K.tocsr()
    T = np.zeros(basis.N)
    if len(dofs_fixed) > 0:
        # apply BCs via row/col zeroing
        dofs_fixed = dofs_fixed.astype(int)
        T[dofs_fixed] = vals_fixed
        # modify f
        f = f - K_coo @ T
        f[dofs_fixed] = vals_fixed

        free = np.setdiff1d(np.arange(basis.N), dofs_fixed)
        T[free] = spsolve(K_coo[free][:, free], f[free])
    else:
        T = spsolve(K_coo, f)

    nodes = fem_mesh.p.T.tolist()          # [[x,y,z], ...]
    elements = fem_mesh.t.T.tolist()       # [[i,j,k,l], ...]
    temperatures = T.tolist()

    return {
        "nodes": nodes,
        "temperatures": temperatures,
        "elements": elements,
        "stats": {
            "n_nodes": len(nodes),
            "n_elements": len(elements),
            "t_min": float(np.min(T)),
            "t_max": float(np.max(T)),
        },
    }


# ---------- API models ----------

class BoundaryCondition(BaseModel):
    boundary: str = "all"   # "all" | "min_z" | "max_z" | "min_x" | "max_x"
    temp: float = 25.0

class SolveRequest(BaseModel):
    conductivity: float = 50.0        # W/(m·K)  steel ~50, copper ~400, air ~0.026
    heat_source: float = 0.0          # W/m³
    boundary_conditions: list[BoundaryCondition] = []


# ---------- in-memory mesh store (single session) ----------
_mesh_store: dict[str, MeshTet] = {}


# ---------- endpoints ----------

@app.post("/api/thermal/upload")
async def upload_stl(file: UploadFile = File(...)):
    """STL 파일 업로드 → 메시 생성 → mesh_id 반환"""
    if not file.filename.lower().endswith(".stl"):
        raise HTTPException(400, "STL 파일만 지원합니다.")

    stl_bytes = await file.read()
    try:
        fem_mesh = stl_to_mesh(stl_bytes)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"메시 생성 실패: {e}")

    mesh_id = file.filename
    _mesh_store[mesh_id] = fem_mesh

    nodes = fem_mesh.p.T
    bbox = {
        "x": [float(nodes[:, 0].min()), float(nodes[:, 0].max())],
        "y": [float(nodes[:, 1].min()), float(nodes[:, 1].max())],
        "z": [float(nodes[:, 2].min()), float(nodes[:, 2].max())],
    }

    return {
        "mesh_id": mesh_id,
        "n_nodes": int(fem_mesh.p.shape[1]),
        "n_elements": int(fem_mesh.t.shape[1]),
        "bbox": bbox,
    }


@app.post("/api/thermal/solve/{mesh_id}")
async def solve(mesh_id: str, req: SolveRequest):
    """저장된 메시에 경계조건 적용 후 정상상태 열해석"""
    fem_mesh = _mesh_store.get(mesh_id)
    if fem_mesh is None:
        raise HTTPException(404, "mesh_id를 찾을 수 없습니다. 먼저 업로드하세요.")

    bcs = [bc.model_dump() for bc in req.boundary_conditions]
    if not bcs:
        # default: bottom fixed at 100°C, top at 25°C
        bcs = [
            {"boundary": "min_z", "temp": 100.0},
            {"boundary": "max_z", "temp": 25.0},
        ]

    try:
        result = solve_steady_state(
            fem_mesh,
            conductivity=req.conductivity,
            dirichlet_bcs=bcs,
            heat_source=req.heat_source,
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"해석 실패: {e}")

    return result


@app.get("/api/thermal/health")
def health():
    return {"status": "ok"}
