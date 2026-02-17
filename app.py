"""
French B2 Dynamic Exercise Book — Édito B2
基于 Streamlit 的法语 B2 互动练习册，Apple Design 风格 UI。
"""

from __future__ import annotations

import json
from pathlib import Path

import streamlit as st

from lib.state import init_state, reset_unit_state
from lib.storage import load_saved_progress

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Vibe Français",
    page_icon="🇫🇷",
    layout="wide",
    initial_sidebar_state="expanded",
)

DATA_PATH = Path(__file__).parent / "data.json"

# ---------------------------------------------------------------------------
# Apple Design CSS
# ---------------------------------------------------------------------------
st.markdown("""
<style>
/* ── 全局 ─────────────────────────────────────────────── */
html, body, [class*="st-"] {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
}
/* 恢复 Streamlit 图标字体（Material Symbols） */
[data-testid="stIconMaterial"],
.material-symbols-rounded,
button[data-testid="stSidebarCollapsedControl"] span,
button[data-testid="baseButton-headerNoPadding"] span,
[data-testid="stExpandSidebarButton"] span {
    font-family: "Material Symbols Rounded", sans-serif !important;
}

.stApp {
    background-color: #F5F5F7;
}

/* ── 主内容区 ─────────────────────────────────────────── */
[data-testid="stMainBlockContainer"] {
    max-width: 1100px;
    padding: 0.2rem 1.5rem 4rem 1.5rem !important;
}

/* ── 卡片容器 ─────────────────────────────────────────── */
div[data-testid="stExpander"],
div[data-testid="stForm"] {
    background: #FFFFFF;
    border-radius: 20px;
    border: 1px solid rgba(0,0,0,0.04);
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    padding: 0.25rem;
    margin-bottom: 1rem;
}

/* Expander 头部 */
div[data-testid="stExpander"] summary {
    font-weight: 600;
    font-size: 1rem;
    padding: 1rem 1.25rem;
}

/* ── 隐藏 Deploy 工具栏（保留侧边栏开关） ────────────── */
header[data-testid="stHeader"] {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: none !important;
    pointer-events: none !important;
}
/* 允许 header 内所有按钮可点击（含侧边栏折叠/展开按钮） */
header[data-testid="stHeader"] button {
    pointer-events: auto !important;
}
button[data-testid="stBaseButton-header"] {
    display: none !important;
}
#MainMenu { visibility: hidden !important; }
._accessibilityToolbar_1lurh_1 { display: none !important; }
[data-testid="stToolbar"] { display: none !important; }
footer { visibility: hidden !important; }

/* 侧边栏开关按钮样式 */
button[data-testid="stSidebarCollapsedControl"] {
    color: #1D1D1F !important;
    border: none !important;
    background: rgba(255,255,255,0.8) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    border-radius: 10px !important;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08) !important;
    transition: all 0.15s ease !important;
}
button[data-testid="stSidebarCollapsedControl"]:hover {
    background: #FFFFFF !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.12) !important;
}

/* ── 页面顶部 Logo 按钮（可点击回主页） ───────────── */
[data-testid="stMain"] [class*="st-key-logo_home"] .stButton > button,
[data-testid="stMain"] [class*="st-key-logo_home"] .stButton > button:not([kind="primary"]) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
    min-height: auto !important;
    cursor: pointer !important;
    text-align: left !important;
    justify-content: flex-start !important;
    color: #1D1D1F !important;
}
[data-testid="stMain"] [class*="st-key-logo_home"] .stButton > button:hover,
[data-testid="stMain"] [class*="st-key-logo_home"] .stButton > button:focus,
[data-testid="stMain"] [class*="st-key-logo_home"] .stButton > button:active {
    background: transparent !important;
    color: #1D1D1F !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    transform: none !important;
}
[data-testid="stMain"] [class*="st-key-logo_home"] .stButton > button p {
    font-size: 2.1rem !important;
    font-weight: 800 !important;
    color: inherit !important;
    letter-spacing: -0.5px !important;
    line-height: 1.2 !important;
    white-space: nowrap !important;
}

/* ── 单元卡片：可点击 ────────────────────────────────── */
.unit-card {
    background: #fff;
    border-radius: 14px;
    padding: 1rem 1.1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.04);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
}
[data-testid="stHorizontalBlock"]:has(.unit-card) {
    gap: 1rem !important;
    margin-bottom: 0.8rem !important;
}
[data-testid="stColumn"]:has(.unit-card) > [data-testid="stVerticalBlock"] > [data-testid="stElementContainer"]:first-child {
    flex: 1 !important;
}
[data-testid="stColumn"]:has(.unit-card) > [data-testid="stVerticalBlock"] > [data-testid="stElementContainer"]:first-child .stMarkdown {
    height: 100% !important;
}
.unit-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    transform: translateY(-1px);
}
.card-action {
    color: #007AFF;
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 0.5rem;
}
[data-testid="stColumn"]:has(.unit-card) > [data-testid="stVerticalBlock"] {
    position: relative !important;
}
[class*="st-key-home_unit_"] {
    position: absolute !important;
    inset: 0 !important;
    z-index: 5 !important;
}
[class*="st-key-home_unit_"] .stButton {
    height: 100% !important;
}
[class*="st-key-home_unit_"] .stButton > button {
    width: 100% !important;
    height: 100% !important;
    opacity: 0 !important;
    cursor: pointer !important;
    border: none !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
}

/* ── 横向标签（Tabs）样式 ────────────────────────────── */
button[data-baseweb="tab"] {
    background: transparent !important;
    border: none !important;
    border-bottom: none !important;
    color: #8E8E93 !important;
    font-weight: 500 !important;
    font-size: 0.9rem !important;
    padding: 0.6rem 1.2rem !important;
    border-radius: 10px !important;
    transition: all 0.15s ease !important;
}
button[data-baseweb="tab"]:hover {
    background: rgba(0,0,0,0.04) !important;
    color: #1D1D1F !important;
}
button[data-baseweb="tab"][aria-selected="true"] {
    background: #007AFF !important;
    color: #FFFFFF !important;
    font-weight: 600 !important;
}
button[data-baseweb="tab"][aria-selected="true"] p {
    color: #FFFFFF !important;
}
[data-baseweb="tab-highlight"],
[data-baseweb="tab-border"] {
    display: none !important;
}
div[data-baseweb="tab-list"] {
    gap: 0.3rem !important;
    background: rgba(0,0,0,0.03);
    border-radius: 12px;
    padding: 0.25rem;
}

/* ── 按钮文字样式修复（Streamlit <p> 覆盖问题） ────── */
.stButton > button p {
    color: inherit !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    font-family: inherit !important;
    letter-spacing: inherit !important;
}

/* ── 按钮 ─────────────────────────────────────────────── */
button[kind="primary"],
.stButton > button[kind="primary"] {
    background: transparent !important;
    color: #007AFF !important;
    border: 2px solid #007AFF !important;
    border-radius: 14px !important;
    padding: 0.6rem 1.6rem !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    transition: all 0.2s ease !important;
    box-shadow: none !important;
}
button[kind="primary"]:hover,
.stButton > button[kind="primary"]:hover {
    background: #0056CC !important;
    border-color: #0056CC !important;
    color: #FFFFFF !important;
    transform: translateY(-1px) !important;
}
button[kind="primary"]:active {
    transform: translateY(0px) !important;
    background: #004AB5 !important;
    color: #FFFFFF !important;
}

.stButton > button:not([kind="primary"]) {
    border-radius: 10px !important;
    border: 1px solid #D1D1D6 !important;
    font-weight: 500 !important;
    font-size: 0.82rem !important;
    padding: 0.35rem 1rem !important;
    min-height: auto !important;
    transition: all 0.2s ease !important;
    background: #FFFFFF !important;
    color: #007AFF !important;
}
.stButton > button:not([kind="primary"]):hover {
    border-color: #0056CC !important;
    color: #FFFFFF !important;
    background: #0056CC !important;
}

/* ── 侧边栏 ──────────────────────────────────────────── */
section[data-testid="stSidebar"] {
    background: #FFFFFF !important;
    border-right: 1px solid rgba(0,0,0,0.06) !important;
}
section[data-testid="stSidebar"] > div:first-child {
    padding-top: 0.1rem !important;
}
section[data-testid="stSidebar"] .stButton > button {
    text-align: left !important;
    justify-content: flex-start !important;
    border: none !important;
    background: transparent !important;
    border-radius: 10px !important;
    padding: 0.25rem 0.7rem !important;
    font-weight: 500 !important;
    font-size: 0.72rem !important;
    color: #3C3C43 !important;
    transition: all 0.15s ease !important;
    box-shadow: none !important;
    min-height: auto !important;
}
section[data-testid="stSidebar"] .stVerticalBlock {
    gap: 0.15rem !important;
}
section[data-testid="stSidebar"] hr {
    margin: 0.9rem 0 0.9rem !important;
}
section[data-testid="stSidebar"] [class*="st-key-sb_unit_"] .stButton > button {
    font-size: 0.75rem !important;
    font-style: normal !important;
    padding: 0.15rem 0.7rem !important;
    line-height: 1.3 !important;
}
section[data-testid="stSidebar"] [class*="st-key-sb_unit_"] .stButton > button p {
    line-height: 1.3 !important;
}
section[data-testid="stSidebar"] [class*="st-key-sb_unit_"] {
    margin-bottom: 0.35rem !important;
}
section[data-testid="stSidebar"] .stButton > button:hover {
    background: rgba(0,0,0,0.04) !important;
    color: #007AFF !important;
}
section[data-testid="stSidebar"] .stButton > button p {
    color: inherit !important;
    font-weight: inherit !important;
}

/* ── 登录卡片 ─────────────────────────────────────────── */
.login-card {
    max-width: 380px;
    margin: 15vh auto;
    background: #FFFFFF;
    border-radius: 24px;
    padding: 3rem 2.5rem;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    text-align: center;
}
.login-card h2 {
    margin-bottom: 0.25rem;
}

.stRadio div[role="radiogroup"] {
    align-items: flex-start !important;
}
.stRadio div[role="radiogroup"] label {
    text-align: left !important;
    justify-content: flex-start !important;
}

h1 a, h2 a, h3 a, h4 a, h5 a, h6 a {
    display: none !important;
}

div[data-testid="stPlotlyChart"] {
    background: #FFFFFF;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid rgba(0,0,0,0.04);
    padding: 0.5rem;
}

.weak-point-item {
    background: #FFFFFF;
    border-radius: 14px;
    padding: 0.85rem 1.25rem;
    margin-bottom: 0.5rem;
    border: 1px solid rgba(0,0,0,0.04);
    box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
}
.weak-point-item .wp-badge {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0.2rem 0.6rem;
    border-radius: 8px;
    white-space: nowrap;
}
.wp-vocab { background: rgba(0,122,255,0.1); color: #007AFF; }
.wp-gram  { background: rgba(255,159,10,0.1); color: #FF9F0A; }
.wp-expr  { background: rgba(175,82,222,0.1); color: #AF52DE; }
.wp-other { background: rgba(142,142,147,0.1); color: #8E8E93; }
.weak-point-item .wp-text {
    font-size: 0.88rem;
    color: #3C3C43;
    line-height: 1.5;
}
.weak-point-item .wp-unit {
    font-size: 0.75rem;
    color: #8E8E93;
    white-space: nowrap;
}

.stTabs [data-baseweb="tab-list"] {
    gap: 0;
    background: #E5E5EA;
    border-radius: 12px;
    padding: 3px;
}
.stTabs [data-baseweb="tab"] {
    border-radius: 10px;
    font-weight: 500;
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
    color: #3C3C43;
    background: transparent;
}
.stTabs [aria-selected="true"] {
    background: #FFFFFF !important;
    color: #007AFF !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    font-weight: 600;
}

div[data-testid="stMetric"] {
    background: #FFFFFF;
    border-radius: 16px;
    padding: 1.2rem 1rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.04);
    text-align: center;
}
div[data-testid="stMetric"] label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #8E8E93;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
div[data-testid="stMetric"] [data-testid="stMetricValue"] {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1D1D1F;
}

h1 { font-weight: 700 !important; font-size: 2rem !important; color: #1D1D1F !important; letter-spacing: -0.5px !important; line-height: 1.2 !important; }
h2, h3, .stSubheader { font-weight: 600 !important; color: #1D1D1F !important; letter-spacing: -0.3px !important; }
p, li, .stMarkdown { line-height: 1.7 !important; color: #3C3C43 !important; }

.stTextArea textarea { border-radius: 14px !important; border: 1px solid #D1D1D6 !important; font-size: 1rem !important; line-height: 1.7 !important; padding: 1rem !important; transition: border-color 0.2s !important; }
.stTextArea textarea:focus { border-color: #007AFF !important; box-shadow: 0 0 0 3px rgba(0,122,255,0.15) !important; }

.stRadio > div { gap: 0.4rem; }
.stRadio label { background: #FFFFFF; border: 1px solid #E5E5EA; border-radius: 12px; padding: 0.65rem 1rem; margin: 0; transition: all 0.15s ease; cursor: pointer; }
.stRadio label:hover { border-color: #007AFF; background: #F0F7FF; }

div[data-testid="stAlert"] { border-radius: 14px; border: none; font-weight: 500; }
hr { border: none; border-top: 1px solid #E5E5EA; margin: 1.5rem 0; }
audio { border-radius: 14px; width: 100%; }

@media (max-width: 1024px) {
    .main .block-container { padding: 1.25rem 1rem 3rem 1rem; }
    h1 { font-size: 1.6rem !important; }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] { font-size: 1.4rem; }
}
@media (max-width: 768px) {
    .main .block-container { padding: 1rem 0.75rem 2rem 0.75rem; }
    .stTabs [data-baseweb="tab"] { font-size: 0.8rem; padding: 0.4rem 0.6rem; }
}
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# 数据加载
# ---------------------------------------------------------------------------
@st.cache_data
def load_data() -> list[dict]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Session State + 持久化恢复
# ---------------------------------------------------------------------------
init_state()
units = load_data()

# 从持久化存储恢复进度（仅首次加载）
if "progress_loaded" not in st.session_state:
    saved = load_saved_progress()
    if saved["scores"]:
        # JSON key 是字符串，转回 int
        st.session_state.scores = {int(k): v for k, v in saved["scores"].items()}
    if saved["weak_points"]:
        st.session_state.weak_points = saved["weak_points"]
    st.session_state.progress_loaded = True


# ---------------------------------------------------------------------------
# 密码验证
# ---------------------------------------------------------------------------
APP_PASSWORD = "3644"

if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if not st.session_state.authenticated:
    st.markdown('<style>section[data-testid="stSidebar"]{display:none!important;}button[data-testid="stSidebarCollapsedControl"]{display:none!important;}</style>', unsafe_allow_html=True)
    st.markdown("""
    <div class="login-card">
        <h2>🇫🇷 Vibe Français</h2>
        <p style="color:#8E8E93; margin-bottom:1.5rem;">Édito — Cahier dynamique</p>
    </div>
    """, unsafe_allow_html=True)
    _spacer_l, _login_col, _spacer_r = st.columns([1, 1, 1])
    with _login_col:
        _pwd = st.text_input("Mot de passe", type="password", placeholder="Entrez le mot de passe")
        if st.button("Connexion", type="primary", use_container_width=True):
            if _pwd == APP_PASSWORD:
                st.session_state.authenticated = True
                st.rerun()
            else:
                st.error("Mot de passe incorrect.")
    st.stop()


# ---------------------------------------------------------------------------
# 侧边栏导航
# ---------------------------------------------------------------------------
with st.sidebar:
    st.caption("NAVIGATION")
    if st.button("Accueil", key="sb_home", use_container_width=True):
        st.session_state.current_page = "home"
        st.session_state.current_unit = None
        st.rerun()
    if st.button("Progrès", key="sb_progress", use_container_width=True):
        st.session_state.current_page = "progress"
        st.rerun()
    if st.button("Examen Blanc B2", key="sb_exam_blanc", use_container_width=True):
        st.session_state.current_page = "exam_blanc"
        st.rerun()

    st.caption("UNITÉS")
    for _u in units:
        _n = _u["unit_number"]
        _score_marker = ""
        if _n in st.session_state.scores:
            _best = max(st.session_state.scores[_n])
            _score_marker = f" · {_best}%"
        _label = f"Unité {_n}: {_u['theme']}{_score_marker}"
        if st.button(_label, key=f"sb_unit_{_n}", use_container_width=True):
            st.session_state.current_page = "unit"
            st.session_state.current_unit = _n
            reset_unit_state()
            st.rerun()

    st.caption("PARAMÈTRES")
    st.text_input("OpenRouter API Key", type="password", key="openrouter_api_key",
                  help="openrouter.ai — 用于生成题目和评分")
    _has_key = st.session_state.get("openrouter_api_key") or st.secrets.get("OPENROUTER_API_KEY", "")
    if _has_key:
        st.success("API Key ✓", icon="🔑")
    else:
        st.warning("需要 API Key", icon="⚠️")


# ---------------------------------------------------------------------------
# 页面顶部 Logo
# ---------------------------------------------------------------------------
if st.button("🇫🇷 Vibe Français", key="logo_home", use_container_width=True):
    st.session_state.current_page = "home"
    st.session_state.current_unit = None
    st.rerun()


# ---------------------------------------------------------------------------
# 主路由
# ---------------------------------------------------------------------------
from views.home import render_home  # noqa: E402
from views.unit import render_unit  # noqa: E402
from views.progress import render_progress  # noqa: E402
from views.exam_blanc import render_exam_blanc  # noqa: E402

page = st.session_state.current_page

if page == "unit" and st.session_state.current_unit:
    render_unit(units)
elif page == "progress":
    render_progress()
elif page == "exam_blanc":
    render_exam_blanc(units)
else:
    render_home(units)
