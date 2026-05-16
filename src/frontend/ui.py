import gradio as gr
import httpx
import asyncio

BACKEND_URL = "http://localhost:8000/analyze"

async def call_analysis(files, persona_desc):
    if not files:
        yield {
            input_screen: gr.update(visible=True),
            progress_screen: gr.update(visible=False),
            result_screen: gr.update(visible=False),
            error_msg: "파일을 업로드해주세요."
        }
        return

    # 화면 2: 진행 중 표시
    yield {
        input_screen: gr.update(visible=False),
        progress_screen: gr.update(visible=True),
        status_text: "🧬 사용자님이 요청하신 페르소나를 형성하고 있습니다..."
    }
    await asyncio.sleep(2)
    
    yield {
        status_text: "🔍 형성된 페르소나가 실제로 QA를 진행하고 있습니다..."
    }

    # 백엔드 호출
    try:
        async with httpx.AsyncClient() as client:
            # Multipart form-data 생성
            data = {"persona_desc": persona_desc}
            upload_files = []
            for f in files:
                # f.name은 파일 경로, f는 파일 객체
                with open(f.name, "rb") as rb:
                    upload_files.append(("files", (f.orig_name if hasattr(f, 'orig_name') else f.name, rb.read())))

            response = await client.post(BACKEND_URL, data=data, files=upload_files, timeout=60.0)
            
            if response.status_code == 200:
                res = response.json()

                score_val = f"혼란 지수: {res['confusion_score']} / 100"
                cohort_framing = res.get("cohort_framing", "")
                abandoned_str = "⚠️ 이탈 예측됨" if res.get("abandoned") else "✅ 완료 가능"

                think_aloud_html = f"<blockquote style='border-left:4px solid #f59e0b; padding-left:12px; color:#374151;'>{res.get('think_aloud', '')}</blockquote>"

                top3_html = "<ul>"
                for item in res.get("top3", []):
                    severity_pct = int(item.get("severity", 0) * 100)
                    top3_html += (
                        f"<li><b>[line {item.get('line_number', '?')}]</b> "
                        f"{item.get('reason', '')} "
                        f"<span style='color:#6b7280; font-size:0.85em;'>({item.get('evidence', '')})</span>"
                        f" — 심각도 {severity_pct}%</li>"
                    )
                top3_html += "</ul>"

                fix_prompts_val = "\n\n".join(res.get("fix_prompts", []))

                yield {
                    progress_screen: gr.update(visible=False),
                    result_screen: gr.update(visible=True),
                    score_display: score_val,
                    drop_off_display: f"### {abandoned_str}\n{cohort_framing}",
                    timeline_display: think_aloud_html + top3_html,
                    fix_prompts: fix_prompts_val
                }
            else:
                yield {
                    progress_screen: gr.update(visible=False),
                    input_screen: gr.update(visible=True),
                    error_msg: f"Backend Error: {response.text}"
                }
    except Exception as e:
        yield {
            progress_screen: gr.update(visible=False),
            input_screen: gr.update(visible=True),
            error_msg: f"Connection Error: {str(e)}"
        }

def go_back():
    return {
        input_screen: gr.update(visible=True),
        result_screen: gr.update(visible=False),
        error_msg: ""
    }

with gr.Blocks(theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🧪 PersonaLab: UX Linter for Vibe Coders")
    
    # 화면 1: 입력
    with gr.Column(visible=True) as input_screen:
        gr.Markdown("### 📂 Step 1: 프론트엔드 코드 업로드 및 페르소나 설정")
        file_input = gr.File(label="프로젝트 소스코드 (ZIP 또는 다중 파일)", file_count="multiple")
        persona_input = gr.Textbox(
            label="페르소나 설명", 
            placeholder="예: 스마트폰 사용이 서툰 70대 할머니, 성격이 급한 20대 직장인 등",
            lines=3
        )
        error_msg = gr.Markdown("", label="Error")
        analyze_btn = gr.Button("UX 분석 시작", variant="primary")

    # 화면 2: 진행 중
    with gr.Column(visible=False) as progress_screen:
        gr.Markdown("### ⚙️ Step 2: 분석 진행 중")
        status_text = gr.Markdown("페르소나 형성 중...")
        gr.HTML("<div style='text-align:center'><img src='https://i.gifer.com/ZZ5H.gif' width='100'></div>") # 간단한 로딩 바이브

    # 화면 3: 결과
    with gr.Column(visible=False) as result_screen:
        gr.Markdown("### 📊 Step 3: UX 분석 결과")
        with gr.Row():
            score_display = gr.Label(label="전체 혼란 지수")
            drop_off_display = gr.Markdown("")
            
        timeline_display = gr.HTML(label="사용자 시뮬레이션 로그 (Think-Aloud)")
        
        with gr.Accordion("🛠️ Vibe Coding Fix Prompts", open=True):
            fix_prompts = gr.TextArea(label="복사하여 Cursor/v0에 붙여넣으세요", lines=10, interactive=False)
            copy_btn = gr.Button("프롬프트 복사")
            
        back_btn = gr.Button("새로운 분석 시작")

    # 이벤트 연결
    analyze_btn.click(
        call_analysis, 
        inputs=[file_input, persona_input], 
        outputs=[input_screen, progress_screen, result_screen, status_text, score_display, drop_off_display, timeline_display, fix_prompts, error_msg]
    )
    
    back_btn.click(
        go_back,
        outputs=[input_screen, result_screen, error_msg]
    )

if __name__ == "__main__":
    demo.launch(server_port=7860)
