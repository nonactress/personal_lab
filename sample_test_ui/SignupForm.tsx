// SignupForm.tsx
// PersonaLab 데모용 샘플 — 의도적으로 UX 문제 여러 개 심어놓음

export default function SignupForm() {
  return (
    <div className="p-2 max-w-sm">

      {/* 헤더 — 작고 낮은 대비 */}
      <h1 className="text-gray-400 text-xs mb-3">서비스 가입</h1>

      {/* 이메일 — placeholder만 있고 라벨 없음 */}
      <input
        type="email"
        placeholder="이메일"
        className="border border-gray-200 text-gray-300 w-full p-1 text-xs"
      />

      {/* 이메일 인증 안내 — 설명 불충분 */}
      <p className="text-gray-400 text-xs mt-1">
        * 이메일 인증이 필요합니다
      </p>

      {/* 비밀번호 — 조건 숨겨져 있음 */}
      <input
        type="password"
        placeholder="비밀번호"
        className="border border-gray-200 text-gray-300 w-full p-1 text-xs mt-2"
      />

      {/* 비밀번호 확인 */}
      <input
        type="password"
        placeholder="비밀번호 확인"
        className="border border-gray-200 text-gray-300 w-full p-1 text-xs mt-1"
      />

      {/* 다단계 약관 — 읽기 힘든 구조 */}
      <div className="mt-3 text-xs text-gray-500">
        <div>
          <input type="checkbox" id="terms1" />
          <label htmlFor="terms1"> 이용약관 동의 (필수) — <a href="#">전문보기</a></label>
        </div>
        <div>
          <input type="checkbox" id="terms2" />
          <label htmlFor="terms2"> 개인정보 수집 및 이용 동의 (필수) — <a href="#">전문보기</a></label>
        </div>
        <div>
          <input type="checkbox" id="terms3" />
          <label htmlFor="terms3"> 마케팅 정보 수신 동의 (선택)</label>
        </div>
      </div>

      {/* CTA 버튼 — 작고 색상 없음 */}
      <button
        className="text-xs p-1 mt-3 border border-gray-300 text-gray-500"
      >
        가입하기
      </button>

      {/* 로그인 링크 — 눈에 안 띔 */}
      <p className="text-xs text-gray-300 mt-2">
        이미 계정이 있으신가요? <a href="#">로그인</a>
      </p>

    </div>
  );
}
