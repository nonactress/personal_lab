import gradio as gr
import httpx
import asyncio
from html import escape

BACKEND_URL = "http://localhost:8000/analyze"


def _build_annotated_code_html(source_code: str, top3: list) -> str:
    if not source_code:
        return ""
    lines = source_code.split("\n")
    issue_map = {item.get("line_number"): item for item in top3 if item.get("line_number")}

    rows = []
    for i, line in enumerate(lines, 1):
        escaped = escape(line).replace(" ", "&nbsp;")
        if i in issue_map:
            issue = issue_map[i]
            sev = issue.get("severity", 0)
            icon = "🔴" if sev > 0.7 else "🟡" if sev > 0.4 else "🔵"
            bg = "#3d1515" if sev > 0.7 else "#3d2b0a" if sev > 0.4 else "#1a2d3d"
            reason = escape(issue.get("reason", ""))
            rows.append(
                f'<tr style="background:{bg}">'
                f'<td style="color:#666;padding:2px 8px;text-align:right;user-select:none;min-width:32px;vertical-align:top">{i}</td>'
                f'<td style="padding:2px 12px;font-family:monospace;white-space:pre;color:#e2e8f0;vertical-align:top">{escaped}</td>'
                f'<td style="padding:2px 8px;color:#f87171;font-size:0.8em;white-space:nowrap;vertical-align:top">{icon}&nbsp;{reason}</td>'
                f"</tr>"
            )
        else:
            rows.append(
                f"<tr>"
                f'<td style="color:#555;padding:2px 8px;text-align:right;user-select:none;min-width:32px">{i}</td>'
                f'<td style="padding:2px 12px;font-family:monospace;white-space:pre;color:#94a3b8">{escaped}</td>'
                f"<td></td>"
                f"</tr>"
            )

    table = "".join(rows)
    return (
        '<div style="background:#1e1e1e;border-radius:8px;padding:12px;overflow:auto;max-height:360px;margin:12px 0">'
        '<p style="color:#64748b;font-size:0.8em;margin:0 0 8px;font-family:monospace">📄 소스 코드 — 이슈 라인 하이라이트</p>'
        f'<table style="border-collapse:collapse;width:100%">{table}</table>'
        "</div>"
    )


def _build_issue_cards_html(top3: list) -> str:
    if not top3:
        return '<p style="color:#6b7280">감지된 이슈 없음</p>'
    cards = []
    for item in top3:
        sev = item.get("severity", 0)
        sev_pct = int(sev * 100)
        icon = "🔴" if sev > 0.7 else "🟡" if sev > 0.4 else "🔵"
        line = item.get("line_number", "?")
        reason = escape(item.get("reason", ""))
        evidence = escape(item.get("evidence", ""))
        cards.append(
            '<details style="margin:6px 0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">'
            '<summary style="padding:10px 14px;cursor:pointer;background:#f9fafb;font-weight:500;list-style:none">'
            f'{icon} <b>[line {line}]</b> {reason}'
            f'<span style="color:#9ca3af;font-size:0.8em;float:right">심각도 {sev_pct}%</span>'
            "</summary>"
            '<div style="padding:10px 14px;background:#fff;color:#6b7280;font-size:0.88em;border-top:1px solid #f3f4f6">'
            f"📚 <b>근거:</b> {evidence}"
            "</div>"
            "</details>"
        )
    return "".join(cards)


async def call_analysis(files, persona_desc):
    if not files:
        yield {
            input_screen: gr.update(visible=True),
            progress_screen: gr.update(visible=False),
            result_screen: gr.update(visible=False),
            error_msg: "파일을 업로드해주세요."
        }
        return

    yield {
        input_screen: gr.update(visible=False),
        progress_screen: gr.update(visible=True),
        status_text: "📂 1/4 — 코드 파싱 중..."
    }
    await asyncio.sleep(1)

    yield {
        status_text: "🧬 2/4 — 페르소나 생성 중..."
    }
    await asyncio.sleep(0.5)

    yield {
        status_text: "🔍 3/4 — UX 시뮬레이션 진행 중..."
    }

    try:
        async with httpx.AsyncClient() as client:
            data = {"persona_desc": persona_desc}
            upload_files = []
            for f in files:
                with open(f.name, "rb") as rb:
                    upload_files.append(("files", (f.orig_name if hasattr(f, "orig_name") else f.name, rb.read())))

            response = await client.post(BACKEND_URL, data=data, files=upload_files, timeout=120.0)

            yield {
                status_text: "📊 4/4 — 리포트 생성 중..."
            }

            if response.status_code == 200:
                res = response.json()

                score = res["confusion_score"]
                if score >= 70:
                    score_val = f"혼란 지수: {score} / 100  🔴 높음 — 즉시 개선 필요 (권장: 40점 이하)"
                elif score >= 40:
                    score_val = f"혼란 지수: {score} / 100  🟡 주의 — 개선 권장 (권장: 40점 이하)"
                else:
                    score_val = f"혼란 지수: {score} / 100  ✅ 양호"

                abandoned_str = "⚠️ 이탈 예측됨" if res.get("abandoned") else "✅ 완료 가능"
                cohort_framing = res.get("cohort_framing", "")

                think_aloud_html = (
                    '<blockquote style="border-left:4px solid #f59e0b;padding:12px 16px;'
                    'background:#fffbeb;border-radius:0 8px 8px 0;margin:0 0 4px;color:#92400e;font-style:italic">'
                    f'💬 {escape(res.get("think_aloud", ""))}'
                    "</blockquote>"
                )

                code_view_html = _build_annotated_code_html(
                    res.get("source_code", ""),
                    res.get("top3", [])
                )

                issue_cards_html = _build_issue_cards_html(res.get("top3", []))

                timeline_html = (
                    think_aloud_html
                    + '<p style="font-weight:600;margin:16px 0 6px;color:#374151">🔍 코드 이슈 위치</p>'
                    + code_view_html
                    + '<p style="font-weight:600;margin:16px 0 6px;color:#374151">📋 이슈 상세 (클릭해서 근거 보기)</p>'
                    + issue_cards_html
                )

                fix_prompts_val = "\n\n".join(res.get("fix_prompts", []))

                # UI 미리보기 iframe
                raw_preview = res.get("preview_html", "")
                if raw_preview:
                    encoded = escape(raw_preview, quote=True)
                    preview_html_widget = (
                        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px">'
                        '<p style="font-size:0.8em;color:#64748b;margin:0 0 8px">📱 UI 미리보기 (375px 모바일 기준)</p>'
                        f'<iframe srcdoc="{encoded}" '
                        'style="width:100%;height:520px;border:1px solid #e2e8f0;border-radius:6px;background:#fff">'
                        '</iframe>'
                        '</div>'
                    )
                else:
                    preview_html_widget = '<p style="color:#9ca3af;font-size:0.9em">UI 미리보기 생성 실패</p>'

                yield {
                    progress_screen: gr.update(visible=False),
                    result_screen: gr.update(visible=True),
                    score_display: score_val,
                    drop_off_display: f"### {abandoned_str}\n{cohort_framing}",
                    ui_preview_display: preview_html_widget,
                    timeline_display: timeline_html,
                    fix_prompts: fix_prompts_val
                }
            else:
                yield {
                    progress_screen: gr.update(visible=False),
                    input_screen: gr.update(visible=True),
                    error_msg: "⚠️ 분석 중 오류가 발생했어요. 업로드한 파일 형식을 확인하거나 잠시 후 다시 시도해주세요."
                }
    except Exception as e:
        yield {
            progress_screen: gr.update(visible=False),
            input_screen: gr.update(visible=True),
            error_msg: "⚠️ 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요. (http://localhost:8000)"
        }


def go_back():
    return {
        input_screen: gr.update(visible=True),
        result_screen: gr.update(visible=False),
        error_msg: ""
    }


with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧪 PersonaLab: UX Linter for Vibe Coders")
    gr.Markdown("*당신의 코드를 실제 유저 눈으로 분석합니다 — 업로드하면 AI가 타겟 사용자 입장에서 UX 문제를 찾아드려요.*")

    with gr.Column(visible=True) as input_screen:
        gr.Markdown("### 📂 Step 1: 프론트엔드 코드 업로드 및 페르소나 설정")
        file_input = gr.File(label="프로젝트 소스코드 (ZIP 또는 .tsx/.jsx/.html/.vue 다중 선택)", file_count="multiple")
        persona_input = gr.Textbox(
            label="타겟 사용자 설명",
            placeholder="예: 디지털 리터러시 낮은 50대 직장인 / 앱을 처음 쓰는 20대 대학생 / 바쁜 30대 프리랜서",
            lines=2,
            info="분석할 가상 사용자를 자유롭게 묘사해주세요. 자세할수록 정확도가 높아집니다."
        )
        error_msg = gr.Markdown("", label="Error")
        analyze_btn = gr.Button("UX 분석 시작", variant="primary")

    with gr.Column(visible=False) as progress_screen:
        gr.Markdown("### ⚙️ Step 2: 분석 진행 중")
        status_text = gr.Markdown("페르소나 형성 중...")
        gr.HTML("<div style='text-align:center'><img src='https://i.gifer.com/ZZ5H.gif' width='80'></div>")

    with gr.Column(visible=False) as result_screen:
        gr.Markdown("### 📊 Step 3: UX 분석 결과")

        with gr.Row():
            with gr.Column(scale=1):
                score_display = gr.Label(label="전체 혼란 지수")
                drop_off_display = gr.Markdown("")
            with gr.Column(scale=1):
                ui_preview_display = gr.HTML()

        gr.Markdown("### 🛠️ Vibe Coding Fix Prompts")
        gr.Markdown("*아래 프롬프트를 Cursor / v0 / Claude에 붙여넣으세요*")
        fix_prompts = gr.TextArea(label="", lines=8, interactive=False)
        copy_btn = gr.Button("📋 프롬프트 복사", variant="primary")

        with gr.Accordion("🔍 상세 분석 보기 (Think-aloud / 코드 이슈)", open=False):
            timeline_display = gr.HTML()

        back_btn = gr.Button("새로운 분석 시작")

    analyze_btn.click(
        call_analysis,
        inputs=[file_input, persona_input],
        outputs=[input_screen, progress_screen, result_screen, status_text, score_display, drop_off_display, ui_preview_display, timeline_display, fix_prompts, error_msg]
    )

    back_btn.click(
        go_back,
        outputs=[input_screen, result_screen, error_msg]
    )

if __name__ == "__main__":
    demo.launch(server_port=7860)
