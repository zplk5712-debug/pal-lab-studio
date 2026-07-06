# OpenCascade(pythonocc-core) 원격 분석 서버

배포된 웹사이트(Netlify)에서도 STEP/STP 조립품의 체적을 자동 계산하기 위한
독립 서버입니다. Render.com 같은 컨테이너 호스팅에 Docker로 배포합니다.

FreeCAD(GUI 데스크톱 앱)를 헤드리스 서버에서 실행하는 시도는 트레이스백 없이
조용히 죽는 문제가 반복되어 포기했고, GUI 의존성이 전혀 없는 OpenCascade
파이썬 바인딩(pythonocc-core)으로 교체했습니다.

## Render.com 배포 방법

1. 이 저장소를 GitHub에 푸시합니다 (이미 되어 있다면 생략).
2. [render.com](https://render.com) 가입 후 대시보드에서 **New > Web Service** 선택.
3. 이 GitHub 저장소를 연결합니다.
4. 설정:
   - **Root Directory**: `remote-analyzer`
   - **Environment**: `Docker`
   - **Instance Type**: `Free`
5. 배포가 끝나면 `https://<서비스이름>.onrender.com` 형태의 URL이 생깁니다.
   `https://<서비스이름>.onrender.com/health` 로 접속해서 `{"status":"ok"}` 가 나오면 정상입니다.

conda 기반 이미지라 첫 빌드는 시간이 좀 걸릴 수 있습니다 (보통 5~10분).

## Netlify에 연결하기

Netlify 사이트 설정 > **Environment variables** 에서 다음을 추가합니다.

```
VITE_MODEL_ANALYZER_URL=https://<서비스이름>.onrender.com
```

값을 추가한 뒤 다시 빌드/배포해야 반영됩니다 (`netlify deploy --prod` 또는 재배포 트리거).

## 참고

- 무료 요금제는 일정 시간 요청이 없으면 슬립 상태가 되어, 다음 요청 때 서버가 깨어나는
  데 30초~1분 정도 걸릴 수 있습니다.
- STEP/STP 파일만 지원합니다.
- 로컬 개발 환경(`npm run dev`)에서는 이 서버 없이도 `vite.config.js`에 내장된
  개발용 FreeCAD 분석기가 그대로 사용됩니다. `VITE_MODEL_ANALYZER_URL`을 설정하지
  않으면 기존 동작(로컬 개발 서버 우선, 실패 시 브라우저 내 텍스트 분석)에 영향이 없습니다.
