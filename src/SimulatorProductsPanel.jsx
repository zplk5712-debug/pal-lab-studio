import { memo } from "react";
import {
  getProductModelNumber,
  getProductCapabilityLabel,
  getProductSpecSummary,
  getRecommendationBadgeText,
} from "./motorSimulatorLogic";
import { DEFAULT_MOTOR_IMAGE } from "./motorSimulatorLogic";

const SimulatorProductsPanel = memo(function SimulatorProductsPanel({
  result,
  isProductsExpanded,
  onToggleProducts,
  isManualsExpanded,
  onToggleManuals,
  webSearchStatus,
  webSearchError,
  webSearchParams,
  webRecommendations,
  webManuals,
  webCandidateProducts,
  onRetryWebSearch,
}) {
  return (
    <div className="side-by-side-row">
      {/* 비교 후보 상세 */}
      <section className={`card card--products card--collapsible${isProductsExpanded ? " is-expanded" : " is-collapsed"}`}>
        <div className="card-section-header">
          <div>
            <h2>비교 후보 상세</h2>
            <p>추천 결과를 먼저 넓게 보고, 필요할 때만 비교 후보와 공식 웹 검색 보강 결과를 펼쳐서 확인할 수 있습니다.</p>
          </div>
          <button type="button" className="ghost-button ghost-button--small" onClick={onToggleProducts}>
            {isProductsExpanded ? "접기" : "펼치기"}
          </button>
        </div>

        {isProductsExpanded ? (
          <>
            {result ? (
              result.productRecommendations.length > 0 ? (
                <>
                  <div className="company-list company-list--compact">
                    {result.productRecommendations.map((product) => (
                      <article className="company-item company-item--compact" key={`${product.series}-${product.productName}-${product.recommendationTierKey}`}>
                        <span className="manual-type">
                          {product.sourceType === "web-manual" ? "웹 매뉴얼 후보" : "등록 제품"}
                        </span>
                        <div className={`recommend-tier-inline recommend-tier-inline--${product.recommendationTierKey}`}>
                          {getRecommendationBadgeText(product)}
                        </div>
                        <div className={`confidence-badge confidence-badge--${product.confidenceKey}`}>
                          신뢰도 {product.confidenceLabel}
                        </div>
                        {product.sourceUrl ? (
                          <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="company-item__image-link">
                            <img className="company-item__image company-item__image--compact" src={product.imageUrl ?? DEFAULT_MOTOR_IMAGE} alt={product.productName} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_MOTOR_IMAGE; }} />
                          </a>
                        ) : (
                          <img className="company-item__image company-item__image--compact" src={DEFAULT_MOTOR_IMAGE} alt={product.productName} onError={e => { e.currentTarget.onerror = null; }} />
                        )}
                        {product.sourceUrl ? (
                          <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="company-item__title">
                            <strong>{product.company} {product.productName}</strong>
                          </a>
                        ) : (
                          <strong>{product.company} {product.productName}</strong>
                        )}
                        <p>모델번호/대표 형번: {getProductModelNumber(product)}</p>
                        <p>{getProductCapabilityLabel(product)}</p>
                        <p>{getProductSpecSummary(product)}</p>
                        {product.recommendationReason && (
                          <p className="recommend-item__reason">{product.recommendationReason}</p>
                        )}
                        {product.engineeringWarnings?.length > 0 && (
                          <ul className="recommend-item__warnings">
                            {product.engineeringWarnings.map((w) => <li key={w}>{w}</li>)}
                          </ul>
                        )}
                      </article>
                    ))}
                  </div>

                  {result.companyComparisonLinks.length > 0 && (
                    <div className="company-compare-box">
                      <div className="summary-caption">다른 회사 공식 비교</div>
                      <div className="company-list company-list--compact company-list--compare">
                        {result.companyComparisonLinks.map((item) => (
                          <article className="company-item company-item--compact company-item--compare" key={item.id}>
                            <span className="manual-type">공식 비교</span>
                            <strong>{item.company}</strong>
                            <p>{item.modelNumber}</p>
                            <p>{item.description}</p>
                            <a href={item.href} target="_blank" rel="noreferrer">공식 사이트 열기</a>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-box">
                  <p>등록 제품 직접 후보는 적지만, 공식 웹 비교 결과를 아래에서 이어서 확인할 수 있습니다.</p>
                </div>
              )
            ) : (
              <div className="empty-box"><p>계산 후 비교 후보 상세가 여기에 표시됩니다.</p></div>
            )}

            {result && (
              <div className="web-search-box">
                <div className="web-search-box__header">
                  <div>
                    <h3>공식 웹 검색 보강</h3>
                    <p>로컬 DB 결과 뒤에 공식 사이트 검색 결과를 추가로 보여줍니다.</p>
                  </div>
                  <button type="button" className="ghost-button" onClick={onRetryWebSearch} disabled={!webSearchParams || webSearchStatus === "loading"}>
                    {webSearchStatus === "loading" ? "검색 중..." : "다시 찾기"}
                  </button>
                </div>
                {webSearchStatus === "loading" && <div className="empty-box"><p>공식 사이트에서 최신 제품 페이지를 찾는 중입니다.</p></div>}
                {webSearchError && <div className="empty-box"><p>{webSearchError === "fetch failed" ? "공식 웹 검색 연결이 잠시 불안정합니다. 잠시 후 다시 찾기를 눌러 주세요." : webSearchError}</p></div>}
                {webSearchStatus === "done" && webRecommendations.length > 0 && (
                  <div className="web-search-list">
                    {webRecommendations.map((item) => (
                      <article className="web-search-item" key={`${item.company}-${item.url}`}>
                        <span className="manual-type">{item.company}</span>
                        <strong>{item.title}</strong>
                        <p>{item.snippet || "공식 사이트 검색 결과입니다."}</p>
                        <a href={item.url} target="_blank" rel="noreferrer">공식 페이지 열기</a>
                      </article>
                    ))}
                  </div>
                )}
                {webSearchStatus === "done" && webRecommendations.length === 0 && !webSearchError && (
                  <div className="empty-box"><p>이번 조건으로는 공식 사이트 검색 결과를 충분히 찾지 못했습니다.</p></div>
                )}
                {webSearchStatus === "done" && webCandidateProducts.length > 0 && (
                  <div className="web-search-manuals">
                    <div className="summary-caption">웹 매뉴얼 추출 추천 후보</div>
                    <div className="web-search-list">
                      {webCandidateProducts.map((item) => (
                        <article className="web-search-item" key={`${item.company}-${item.productName}-${item.modelNumber}`}>
                          <span className="manual-type">{item.company}</span>
                          <strong>{item.productName}</strong>
                          <p>모델번호/대표 형번: {getProductModelNumber(item)}</p>
                          <p>{getProductSpecSummary(item)}</p>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer">원문 PDF 열기</a>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {webSearchStatus === "done" && webManuals.length > 0 && (
                  <div className="web-search-manuals">
                    <div className="summary-caption">추출된 공식 매뉴얼</div>
                    <div className="web-search-list">
                      {webManuals.map((item) => (
                        <article className="web-search-item" key={`${item.company}-${item.url}-manual`}>
                          <span className="manual-type">{item.company}</span>
                          <strong>{item.title}</strong>
                          <p>{item.pageCount ? `${item.pageCount} pages` : "페이지 수 확인 전"} / PDF 추출 완료</p>
                          <p>{item.sample || "추출된 본문 미리보기가 없습니다."}</p>
                          <a href={item.url} target="_blank" rel="noreferrer">PDF 열기</a>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="collapsed-preview">
            공식 웹 비교 후보와 회사별 대안 후보는 접어 두었습니다. 필요할 때 펼쳐서 확인하면 됩니다.
          </div>
        )}
      </section>

      {/* 업로드된 회사 매뉴얼 */}
      <section className={`card card--manuals card--collapsible${isManualsExpanded ? " is-expanded" : " is-collapsed"}`}>
        <div className="card-section-header">
          <div>
            <h2>업로드된 회사 매뉴얼</h2>
            <p>추천 결과를 먼저 보도록 접어 둘 수 있고, 필요할 때만 공식 사이트와 연결된 매뉴얼 목록을 펼칠 수 있습니다.</p>
          </div>
          <button type="button" className="ghost-button ghost-button--small" onClick={onToggleManuals}>
            {isManualsExpanded ? "접기" : "펼치기"}
          </button>
        </div>
        {isManualsExpanded ? (
          result ? (
            result.manualLibrary.length > 0 ? (
              <div className="manual-list manual-list--compact">
                {result.manualLibrary.map((manual) => (
                  <article className="manual-item" key={manual.id}>
                    <span className="manual-type">{manual.type}</span>
                    <strong>{manual.title}</strong>
                    <p>{manual.description}</p>
                    <a href={manual.href} target="_blank" rel="noreferrer">열기</a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-box"><p>현재 조건에 바로 연결된 매뉴얼은 적지만, 공식 사이트 링크와 비교 후보는 함께 활용할 수 있습니다.</p></div>
            )
          ) : (
            <div className="empty-box"><p>계산 후 연결된 회사 매뉴얼이 여기에 표시됩니다.</p></div>
          )
        ) : (
          <div className="collapsed-preview">
            연결된 회사 매뉴얼 목록은 접어 두었습니다. 추천 결과를 먼저 보고 필요할 때만 펼쳐서 확인하면 됩니다.
          </div>
        )}
      </section>
    </div>
  );
});

export default SimulatorProductsPanel;
