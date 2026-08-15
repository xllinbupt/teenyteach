import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  BookOpenText,
  CaretDown,
  CaretRight,
  ChartBar,
  Check,
  CheckCircle,
  Clock,
  Coin,
  Crown,
  Fire,
  GearSix,
  GlobeHemisphereWest,
  House,
  Lightning,
  LockKey,
  MapPin,
  Medal,
  Microphone,
  NotePencil,
  PaperPlaneTilt,
  Pause,
  Play,
  PlayCircle,
  Question,
  SealCheck,
  ShieldCheck,
  SpeakerHigh,
  Sparkle,
  Star,
  Target,
  Trash,
  Trophy,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { askModel, createStudentVoice } from "./ai";

const STORAGE_KEY = "teenyteach-demo-state";

const students = [
  { id: "rabbit", name: "小白", species: "白兔", image: "/assets/student-rabbit.png", sprite: "/assets/student-rabbit-sprite.png", seat: "back-center", color: "#5bb6d6", progress: 82, trait: "好奇探索型" },
  { id: "panda", name: "团团", species: "小熊猫", image: "/assets/student-red-panda.png", sprite: "/assets/student-red-panda-sprite.png", seat: "back-left", color: "#aa75ce", progress: 74, trait: "记忆型" },
  { id: "kitten", name: "橘子", species: "橘猫", image: "/assets/student-kitten.png", sprite: "/assets/student-kitten-sprite.png", seat: "back-right", color: "#ef8d72", progress: 68, trait: "生活经验型" },
  { id: "fox", name: "阿栗", species: "小狐狸", image: "/assets/student-fox.png", sprite: "/assets/student-fox-sprite.png", seat: "front-left", color: "#5f8fcf", progress: 61, trait: "反例型" },
  { id: "bear", name: "大麦", species: "棕熊", image: "/assets/student-bear.png", sprite: "/assets/student-bear-sprite.png", seat: "front-center", color: "#e2ae35", progress: 57, trait: "易混淆型" },
  { id: "hamster", name: "米粒", species: "仓鼠", image: "/assets/student-hamster.png", sprite: "/assets/student-hamster-sprite.png", seat: "front-right", color: "#63a866", progress: 52, trait: "验证型" },
];

const prepCards = {
  question: [
    { id: "iron-ship", title: "铁比水重，铁船为什么不沉？", note: "小白最想知道的迁移问题。", tag: "追问" },
    { id: "clay-shape", title: "橡皮泥为什么捏成船更容易浮？", note: "引导学生观察形状和排水量。", tag: "追问" },
    { id: "submarine", title: "潜水艇怎样上浮和下潜？", note: "给会继续思考的同学一个挑战。", tag: "挑战" },
  ],
};

const questions = [
  "老师，为什么铁做的船不会沉下去？",
  "如果把船里的空气都挤走，它还会浮着吗？",
  "同样大小的木块和铁块，浮力一样吗？",
];

const scoring = [
  { key: "concept", label: "概念准确", score: 92, color: "#55a87b", evidence: "你说清楚了液体会向上托住物体，没有把浮力和重量混在一起。" },
  { key: "clear", label: "讲解清晰", score: 86, color: "#4d9fd2", evidence: "你先说现象，再解释原因，团团和橘子都跟上了。" },
  { key: "transfer", label: "举例迁移", score: 84, color: "#e2ad38", evidence: "你用了轮船举例，并把铁船和普通铁块区分开了。" },
  { key: "answer", label: "回答追问", score: 90, color: "#e4775e", evidence: "你针对小白的问题补充了空气和形状，回答没有绕开问题。" },
];

const rankingRows = [
  { rank: 1, name: "星星探险队", region: "江苏省", score: 96, delta: 2, badge: "火箭班" },
  { rank: 2, name: "小小讲师团", region: "浙江省", score: 94, delta: 1, badge: "海盐章" },
  { rank: 3, name: "好奇号教室", region: "广东省", score: 92, delta: 3, badge: "探索星" },
  { rank: 4, name: "浮力研究所", region: "上海市", score: 90, delta: 0, badge: "实验室" },
  { rank: 5, name: "彩虹三年二班", region: "山东省", score: 89, delta: -1, badge: "彩虹章" },
  { rank: 6, name: "我们的第一班", region: "四川省", score: 87, delta: 4, badge: "新芽章" },
];

const defaultData = {
  className: "浮力小队",
  region: "浙江省",
  classCode: "TNY-6A9P",
  hasClass: false,
  totalXp: 0,
  bestScore: 0,
  completedSessions: 0,
  prepSelections: { concept: [], example: [], question: [] },
  prepConversationAnswers: [],
  prepDraft: {
    experimentRuns: [],
    concept: "",
    exampleId: "",
    exampleExplanation: "",
    questionId: "iron-ship",
    questionAnswer: "",
    trialComplete: false,
  },
  lastResult: null,
};

function loadData() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
  } catch {
    return defaultData;
  }
}

function formatCode(value) {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toUpperCase();
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

export function App() {
  const [path, setPath] = useState(() => window.location.pathname || "/");
  const [data, setData] = useState(loadData);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [clearPrompt, setClearPrompt] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "instant" });
    setSettingsOpen(false);
  };

  const createClass = ({ className, region }) => {
    setData((current) => ({ ...current, className: className.trim() || "浮力小队", region, classCode: "TNY-6A9P", hasClass: true }));
    navigate("/classroom");
  };

  const startLesson = ({ selections, draft }) => {
    setData((current) => ({ ...current, prepSelections: selections, prepDraft: draft }));
    navigate("/teach/session");
  };

  const finishLesson = () => {
    const result = { score: 88, completedAt: new Date().toISOString() };
    setData((current) => ({
      ...current,
      hasClass: true,
      totalXp: current.totalXp + 120,
      bestScore: Math.max(current.bestScore, result.score),
      completedSessions: current.completedSessions + 1,
      lastResult: result,
    }));
    navigate("/result/session");
  };

  const clearLocalData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setData(defaultData);
    setClearPrompt(false);
    navigate("/");
  };

  const isOnboarding = path === "/" || path === "/restore";
  const page = path.startsWith("/prep")
    ? <PrepRoom data={data} setData={setData} navigate={navigate} startLesson={startLesson} />
    : path.startsWith("/teach")
      ? <TeachRoom data={data} navigate={navigate} finishLesson={finishLesson} />
      : path.startsWith("/result")
        ? <ResultRoom data={data} navigate={navigate} />
        : path === "/leaderboard"
          ? <Leaderboard data={data} navigate={navigate} />
          : path === "/privacy"
            ? <PrivacyPage data={data} navigate={navigate} onClear={() => setClearPrompt(true)} />
            : <ClassroomHome data={data} navigate={navigate} />;

  return (
    <div className={`app-root ${quietMode ? "quiet-mode" : ""}`}>
      {isOnboarding ? (
        path === "/restore"
          ? <RestorePage data={data} navigate={navigate} setData={setData} />
          : <WelcomePage data={data} createClass={createClass} navigate={navigate} />
      ) : (
        <>
          <AppTopbar data={data} path={path} navigate={navigate} onSettings={() => setSettingsOpen(true)} />
          {page}
        </>
      )}

      {settingsOpen && (
        <SettingsDialog quietMode={quietMode} setQuietMode={setQuietMode} onClose={() => setSettingsOpen(false)} onPrivacy={() => { setSettingsOpen(false); navigate("/privacy"); }} onClear={() => { setSettingsOpen(false); setClearPrompt(true); }} />
      )}
      {clearPrompt && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setClearPrompt(false)}>
          <section className="pixel-modal danger-modal" role="dialog" aria-modal="true" aria-label="清除本地班级" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="关闭" title="关闭" onClick={() => setClearPrompt(false)}><X weight="bold" /></button>
            <span className="modal-badge danger-badge"><Trash weight="fill" /></span>
            <h2>要清除这个班级吗？</h2>
            <p>这会删除当前设备保存的匿名班级、课堂记录和班级码，之后无法恢复。</p>
            <div className="modal-actions"><button className="modal-secondary" type="button" onClick={() => setClearPrompt(false)}>先不清除</button><button className="modal-danger" type="button" onClick={clearLocalData}>确认清除</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function AppTopbar({ data, path, navigate, onSettings }) {
  return (
    <header className="app-topbar">
      <button className="app-brand" type="button" onClick={() => navigate("/classroom")}>
        <img src="/assets/teacher-avatar.png" alt="小林老师像素头像" />
        <span><strong>TeenyTeach</strong><small>重生之我来当班主任</small></span>
      </button>
      <nav className="app-nav" aria-label="主导航">
        <button className={path === "/classroom" ? "active" : ""} type="button" onClick={() => navigate("/classroom")}><House weight="fill" />教室</button>
        <button className={path.startsWith("/prep") ? "active" : ""} type="button" onClick={() => navigate("/prep/science-buoyancy-01")}><NotePencil weight="fill" />备课</button>
        <button className={path.startsWith("/teach") ? "active" : ""} type="button" onClick={() => navigate("/teach/session")}><PlayCircle weight="fill" />上课</button>
        <button className={path === "/leaderboard" ? "active" : ""} type="button" onClick={() => navigate("/leaderboard")}><ChartBar weight="fill" />排行榜</button>
      </nav>
      <div className="app-top-actions">
        <span className="top-class-chip"><MapPin weight="fill" />{data.region} · {data.className}</span>
        <button className="top-icon-button" type="button" aria-label="设置" title="设置" onClick={onSettings}><GearSix weight="bold" /></button>
      </div>
    </header>
  );
}

function WelcomePage({ data, createClass, navigate }) {
  const [className, setClassName] = useState(data.hasClass ? data.className : "浮力小队");
  const [region, setRegion] = useState(data.region || "浙江省");
  const [step, setStep] = useState(1);

  return (
    <main className="welcome-page">
      <header className="welcome-topbar"><div className="welcome-brand"><span className="brand-spark"><Sparkle weight="fill" /></span><span><strong>TeenyTeach</strong><small>重生之我来当班主任</small></span></div><button className="text-link" type="button" onClick={() => navigate("/restore")}>我有班级码 <ArrowRight weight="bold" /></button></header>
      <div className="welcome-grid">
        <section className="welcome-copy">
          <p className="eyebrow"><SealCheck weight="fill" />你的第一天班主任任务</p>
          <h1>接手一间<br /><em>会成长的教室</em></h1>
          <p className="welcome-lead">为了不被学生问住，你要先学会，再教会。每一次备课、讲解和答疑，都会变成班级的真实成长。</p>
          <div className="onboarding-steps" aria-label="创建班级步骤">
            {["选头像", "起班名", "选区域"].map((label, index) => <span className={step === index + 1 ? "current" : step > index + 1 ? "done" : ""} key={label}><b>{step > index + 1 ? <Check weight="bold" /> : index + 1}</b>{label}</span>)}
          </div>
          <form className="welcome-form" onSubmit={(event) => { event.preventDefault(); if (step < 3) setStep((value) => value + 1); else createClass({ className, region }); }}>
            {step === 1 && <div className="form-stage"><span className="section-kicker">班主任头像</span><div className="avatar-choice selected"><img src="/assets/teacher-avatar.png" alt="戴眼镜的小林老师" /><span><b>小林老师</b><small>今天也要把课讲明白</small></span><CheckCircle weight="fill" /></div><p className="field-hint">之后可以在设置里更换班主任形象。</p></div>}
            {step === 2 && <label className="form-stage form-label"><span className="section-kicker">给你的班级起个名字</span><input value={className} onChange={(event) => setClassName(event.target.value.slice(0, 12))} autoFocus maxLength={12} /><small>建议使用一个让全班都想努力的名字，最多 12 个字。</small></label>}
            {step === 3 && <label className="form-stage form-label"><span className="section-kicker">你想代表哪个省份</span><div className="select-wrap"><MapPin weight="fill" /><select value={region} onChange={(event) => setRegion(event.target.value)}><option>浙江省</option><option>江苏省</option><option>广东省</option><option>四川省</option><option>上海市</option><option>山东省</option></select><CaretDown weight="bold" /></div><small>排行榜只展示省份，不采集学校和城市。</small></label>}
            <button className="primary-command" type="submit">{step < 3 ? "下一步" : data.hasClass ? "重新接班" : "开始接班"}<ArrowRight weight="bold" /></button>
          </form>
          {data.hasClass && <button className="continue-class" type="button" onClick={() => navigate("/classroom")}><House weight="fill" />继续进入「{data.className}」</button>}
        </section>
        <section className="welcome-scene" aria-label="六位像素动物学生的教室">
          <ClassroomScene mode="welcome" />
          <div className="scene-caption"><span className="live-dot" /><b>三年二班正在等你</b><small>六位学生 · 一个新任务</small></div>
          <div className="scene-note"><BookOpenText weight="fill" /><span><b>今日黑板任务</b><strong>讲清楚浮力</strong></span></div>
        </section>
      </div>
    </main>
  );
}

function RestorePage({ data, navigate, setData }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const restore = (event) => {
    event.preventDefault();
    if (formatCode(code) !== data.classCode && formatCode(code) !== "TNY-6A9P") {
      setError("没有找到这个班级码，请检查字母和数字是否输入正确。");
      return;
    }
    setData((current) => ({ ...current, hasClass: true }));
    navigate("/classroom");
  };
  return (
    <main className="restore-page"><div className="restore-paper"><button className="back-link" type="button" onClick={() => navigate("/")}><ArrowLeft weight="bold" />返回接班入口</button><span className="modal-badge"><LockKey weight="fill" /></span><h1>恢复你的班级</h1><p>输入创建班级时生成的 8 位班级码，就能找回班级名、成长值和课堂记录。</p><form onSubmit={restore}><label>班级码<input value={code} onChange={(event) => { setCode(formatCode(event.target.value)); setError(""); }} placeholder="例如 TNY-6A9P" inputMode="text" /></label>{error && <span className="form-error">{error}</span>}<button className="primary-command" type="submit">恢复班级 <ArrowRight weight="bold" /></button></form><div className="restore-tip"><ShieldCheck weight="fill" /><span><b>匿名班级</b><small>班级码只保存在你的设备和你手里，不需要真实姓名。</small></span></div></div></main>
  );
}

function ClassroomScene({ mode = "lesson", step = 0, activeState = "", recording = false, selectedStudent = "", completedStudentIds = [], onSelect }) {
  const [localSelected, setLocalSelected] = useState("");
  const activeStudent = selectedStudent || localSelected;
  const homeStates = ["asking", "listening", "thinking", "happy", "idle", "happy"];
  const stateLabels = { idle: "准备上课", listening: "认真听讲", asking: "正在举手", thinking: "正在思考", happy: "听懂啦" };
  const chooseStudent = (id) => {
    if (onSelect) onSelect(id);
    else setLocalSelected((current) => current === id ? "" : id);
  };
  const getState = (student, index) => {
    if (localSelected === student.id) return "happy";
    if (mode !== "lesson") return homeStates[index];
    if (recording) return "listening";
    if (completedStudentIds.includes(student.id)) return "happy";
    if (activeState && activeStudent === student.id) return activeState;
    if (step > 0 && activeStudent === student.id) return "asking";
    if (step > 1 && index < step - 1) return "happy";
    if (step > 0 && index === (step + 2) % students.length) return "thinking";
    return "idle";
  };

  return (
    <div className={`classroom-scene scene-${mode}`}>
      <div className="classroom-canvas">
        <img className="classroom-image" src="/assets/classroom-empty.png" alt="六个座位的像素科学教室" />
        <div className="classroom-pets" aria-label="六位会回应课堂的动物学生">
          {students.map((student, index) => {
            const state = getState(student, index);
            return (
              <button className={`classroom-pet seat-${student.seat} state-${state} ${activeStudent === student.id ? "selected" : ""}`} type="button" key={student.id} onClick={() => chooseStudent(student.id)} aria-pressed={activeStudent === student.id} title={`${student.name} · ${stateLabels[state]}`}>
                <span className="pet-reaction" aria-hidden="true">{state === "asking" ? <Question weight="fill" /> : state === "thinking" ? <BookOpen weight="fill" /> : state === "happy" ? <Sparkle weight="fill" /> : state === "listening" ? <SpeakerHigh weight="fill" /> : null}</span>
                <img src={student.sprite} alt={`${student.species}${student.name}，${stateLabels[state]}`} />
                <span className="pet-name"><b>{student.name}</b><small>{stateLabels[state]}</small></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClassroomHome({ data, navigate }) {
  const xp = Math.min(100, 36 + data.completedSessions * 28);
  return (
    <main className="page-shell classroom-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow"><Crown weight="fill" />{data.region} · 匿名班级</p>
          <h1>{data.className}</h1>
          <p className="home-lead">今天你要带六位学生，把“浮力”讲到他们真的听懂。</p>
          <div className="home-actions"><button className="primary-command" type="button" onClick={() => navigate("/prep/science-buoyancy-01")}><NotePencil weight="fill" />进入备课室 <ArrowRight weight="bold" /></button><button className="secondary-command" type="button" onClick={() => navigate("/teach/session")}><PlayCircle weight="fill" />直接上课</button></div>
          <div className="class-growth-block"><div><span>班级成长</span><b>{xp}%</b></div><div className="large-progress"><span style={{ width: `${xp}%` }} /></div><small>{data.completedSessions ? `已经完成 ${data.completedSessions} 堂课，继续保持。` : "完成第一堂课，解锁班级榜单。"}</small></div>
        </div>
        <div className="home-hero-visual"><ClassroomScene mode="home" /><div className="visual-stamp"><Star weight="fill" /><span><b>今日任务</b><strong>讲清楚浮力</strong></span></div></div>
      </section>
      <section className="home-band"><div className="band-title"><div><span className="section-kicker">班主任工作台</span><h2>今天先完成这一件事</h2></div><span className="task-time"><Clock weight="fill" />约 3-5 分钟</span></div><div className="task-overview"><div className="task-overview-icon"><BookOpenText weight="fill" /></div><div className="task-overview-copy"><h3>讲清楚浮力</h3><p>让每位同学都能用自己的话，说出物体浮沉的秘密。</p><div className="mini-tags"><span>科学 · 生活中的力</span><span>适合 9-12 岁</span><span>奖励 +120 成长值</span></div></div><button className="arrow-command" type="button" onClick={() => navigate("/prep/science-buoyancy-01")} aria-label="开始备课" title="开始备课"><ArrowRight weight="bold" /></button></div></section>
      <section className="home-grid"><div className="history-panel"><div className="band-title"><div><span className="section-kicker">课堂记录</span><h2>你的教学足迹</h2></div><button className="inline-link" type="button" onClick={() => navigate("/result/session")}>查看最近一课 <ArrowRight weight="bold" /></button></div>{data.completedSessions ? <div className="history-row"><span className="history-icon"><CheckCircle weight="fill" /></span><span><b>浮力 · 第一次正式上课</b><small>班级成长 +120 · 综合反馈 {data.bestScore} 分</small></span><SealCheck weight="fill" /></div> : <div className="empty-history"><PlayCircle weight="fill" /><span><b>还没有课堂记录</b><small>备课完成后，你的第一堂课会出现在这里。</small></span></div>}</div><div className="shortcut-panel"><div className="band-title"><div><span className="section-kicker">班级工具</span><h2>随时可以打开</h2></div></div><div className="shortcut-grid"><button type="button" onClick={() => navigate("/leaderboard")}><ChartBar weight="fill" /><span><b>省级 / 全国榜</b><small>看看班级位置</small></span></button><button type="button" onClick={() => navigate("/privacy")}><ShieldCheck weight="fill" /><span><b>隐私与边界</b><small>了解数据怎么用</small></span></button></div></div></section>
    </main>
  );
}

function PrepRoom({ data, setData, navigate, startLesson }) {
  const openingMessage = "今天要给动物同学们讲“浮力”。如果现在小白就坐在你面前，你会怎么解释浮力？";
  const savedAnswers = (data.prepConversationAnswers || []).slice(0, 3);

  const acceptedReply = (index) => {
    if (index === 0) return "你已经抓住了浮力的核心。我们让它更像一段能听懂的讲解：用铁块和铁船作比较，你会怎么说明它们为什么一个沉、一个浮？";
    if (index === 1) return "这个例子很有用了。现在小白举手追问：“如果把船里的空气都挤走，它还会浮着吗？”你准备怎么回答？";
    return "可以上课了。你已经准备好一句自己的解释、一个能听懂的例子，也接住了学生可能提出的问题。";
  };

  const buildMessages = (saved) => {
    const next = [{ role: "ai", text: openingMessage }];
    saved.forEach((text, index) => {
      next.push({ role: "user", text });
      next.push({ role: "ai", text: acceptedReply(index), success: index === 2 });
    });
    return next;
  };

  const [answers, setAnswers] = useState(savedAnswers);
  const [messages, setMessages] = useState(() => buildMessages(savedAnswers));
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [modelMode, setModelMode] = useState("idle");
  const chatMessagesRef = useRef(null);
  const stage = answers.length;
  const ready = stage >= 3;
  const hints = [
    "可以想想：物体放进水里时，水会从哪个方向托住它？",
    "先比较它们的形状，再想想谁能排开更多的水。",
    "可以从船身是否中空、能排开多少水来解释。",
  ];
  const placeholders = ["用自己的话说说浮力……", "用铁块和铁船讲讲看……", "回答小白的追问……"];

  useEffect(() => {
    const messagePanel = chatMessagesRef.current;
    messagePanel?.scrollTo({ top: messagePanel.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const assessAnswer = (index, text) => {
    if (index === 0) {
      const hasLiquid = /水|液体/.test(text);
      const hasLift = /向上|托|浮力/.test(text);
      if (!hasLiquid || !hasLift) return "你已经开始解释了。再补一补：是谁在托住物体，这个力大致朝哪个方向？";
    }
    if (index === 1) {
      const hasBoat = /船|铁/.test(text);
      const hasReason = /空|形状|排开|更多水|体积/.test(text);
      if (!hasBoat || !hasReason) return "现象说到了，再把原因讲清一点：铁船的形状和它排开的水有什么关系？";
    }
    if (index === 2 && !/空气|空|形状|排开|浮力|沉|水/.test(text)) {
      return "先直接回答“会不会”，再说说空气变少后，船排开水的能力会发生什么变化。";
    }
    return "";
  };

  const saveAnswers = (nextAnswers) => {
    const nextDraft = {
      ...defaultData.prepDraft,
      ...(data.prepDraft || {}),
      concept: nextAnswers[0] || "",
      exampleId: nextAnswers[1] ? "ship" : "",
      exampleExplanation: nextAnswers[1] || "",
      questionId: "iron-ship",
      questionAnswer: nextAnswers[2] || "",
      trialComplete: nextAnswers.length >= 3,
    };
    setData((current) => ({ ...current, prepConversationAnswers: nextAnswers, prepDraft: nextDraft }));
    return nextDraft;
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const clean = input.trim();
    if (!clean || typing || ready) return;
    const currentStage = stage;
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setInput("");
    setHintOpen(false);
    setTyping(true);
    let result;
    try {
      result = await askModel({ kind: "prep", stage: currentStage, text: clean, previousAnswers: answers });
      setModelMode("online");
    } catch {
      const retryMessage = assessAnswer(currentStage, clean);
      result = { accepted: !retryMessage, reply: retryMessage || acceptedReply(currentStage) };
      setModelMode("offline");
    }
    if (result.accepted) {
      const nextAnswers = [...answers, clean];
      setAnswers(nextAnswers);
      saveAnswers(nextAnswers);
      setMessages((current) => [...current, { role: "ai", text: result.reply, success: currentStage === 2 }]);
    } else {
      setMessages((current) => [...current, { role: "ai", text: result.reply, retry: true }]);
    }
    setTyping(false);
  };

  const restartPrep = () => {
    setAnswers([]);
    setMessages([{ role: "ai", text: openingMessage }]);
    setInput("");
    setHintOpen(false);
    setTyping(false);
    setModelMode("idle");
    saveAnswers([]);
  };

  const goTeaching = () => {
    const draft = saveAnswers(answers);
    startLesson({ selections: { concept: ["own-words"], example: ["ship"], question: ["iron-ship"] }, draft });
  };

  return (
    <main className="page-shell prep-page prep-conversation-page">
      <section className="prep-conversation-hero">
        <div><p className="eyebrow"><NotePencil weight="fill" />备课室 · 本章主题</p><h1>和备课搭子把“浮力”聊明白</h1><p>不用填写教案。先说出你的理解，搭子会帮你补上例子和学生可能追问的地方。</p></div>
        <div className="prep-topic-card"><span>科学</span><b>浮力</b><small>生活中的力</small></div>
      </section>

      <section className="prep-conversation-layout">
        <section className="prep-chat" aria-label="与备课搭子对话">
          <header className="prep-chat-header">
            <span className="prep-ai-avatar"><Sparkle weight="fill" /></span>
            <div><small>AI 备课搭子</small><h2>小墨</h2></div>
            <span className={`prep-chat-status ${modelMode}`}><i />{modelMode === "online" ? "千问已连接" : modelMode === "offline" ? "离线引导" : "AI 准备就绪"}</span>
            <button type="button" onClick={restartPrep}><Trash weight="fill" />重新聊</button>
          </header>

          <div ref={chatMessagesRef} className="prep-chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`prep-message ${message.role} ${message.retry ? "retry" : ""} ${message.success ? "success" : ""}`} key={`${message.role}-${index}-${message.text}`}>
                {message.role === "ai" ? <span className="message-avatar"><Sparkle weight="fill" /></span> : <img className="message-avatar" src="/assets/teacher-avatar.png" alt="小林老师" />}
                <div><small>{message.role === "ai" ? "小墨" : "我"}</small><p>{message.text}</p></div>
              </div>
            ))}
            {typing && <div className="prep-message ai typing"><span className="message-avatar"><Sparkle weight="fill" /></span><div><small>小墨正在想</small><p><i /><i /><i /></p></div></div>}
            <div />
          </div>

          <form className="prep-chat-compose" onSubmit={sendMessage}>
            {!ready && <div className="prep-chat-support"><button type="button" onClick={() => setHintOpen((value) => !value)}><Question weight="fill" />给我一点提示</button>{hintOpen && <span>{hints[stage]}</span>}</div>}
            <div className="prep-chat-input"><textarea value={input} disabled={ready || typing} onChange={(event) => setInput(event.target.value)} maxLength={180} placeholder={ready ? "讲课提纲已经准备好了" : placeholders[stage]} /><button type="submit" disabled={ready || typing || input.trim().length < 2} aria-label="发送给备课搭子" title="发送"><PaperPlaneTilt weight="fill" /></button></div>
          </form>
        </section>

        <aside className={`prep-cheatsheet ${ready ? "ready" : ""}`} aria-label="自动生成的讲课提纲">
          <header><span><BookOpenText weight="fill" /></span><div><small>聊天时自动整理</small><h2>我的讲课提纲</h2></div>{ready && <CheckCircle weight="fill" />}</header>
          <div className="cheatsheet-topic"><small>本章主题</small><b>浮力</b><span>讲给六位动物同学听</span></div>
          <ol className="cheatsheet-notes">
            <li className={answers[0] ? "filled" : ""}><span>1</span><div><b>我先这样解释</b><p>{answers[0] || "聊完第一句话后，这里会出现你的解释。"}</p></div></li>
            <li className={answers[1] ? "filled" : ""}><span>2</span><div><b>我会这样举例</b><p>{answers[1] || "搭子会请你用铁块和铁船讲清楚。"}</p></div></li>
            <li className={answers[2] ? "filled" : ""}><span>3</span><div><b>小白追问时</b><small>如果把船里的空气都挤走，它还会浮着吗？</small><p>{answers[2] || "你的回答会自动记在这里。"}</p></div></li>
          </ol>
          <button className="prep-go-teach" type="button" disabled={!ready} onClick={goTeaching}><PlayCircle weight="fill" /><span><b>{ready ? "准备好了，去上课" : "聊明白后就能上课"}</b><small>{ready ? "开始讲给动物同学们听" : "不用背下来，用自己的话讲"}</small></span><ArrowRight weight="bold" /></button>
          <button className="prep-preview-class" type="button" onClick={() => navigate("/teach/session")}>先看看教室 <ArrowRight weight="bold" /></button>
        </aside>
      </section>
    </main>
  );
}

function TeachRoom({ data, navigate, finishLesson }) {
  const classroomStageRef = useRef(null);
  const dialogueLogRef = useRef(null);
  const historyIdRef = useRef(0);
  const studentAudioRef = useRef(null);
  const studentVoiceUrlsRef = useRef(new Map());
  const [phase, setPhase] = useState("lecture");
  const [turn, setTurn] = useState(0);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hasSpoken, setHasSpoken] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState([]);
  const [speaking, setSpeaking] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [modelThinking, setModelThinking] = useState(false);
  const [modelMode, setModelMode] = useState("idle");
  const preparedQuestion = prepCards.question.find((item) => item.id === data.prepDraft?.questionId)?.title;
  const fallbackTurns = useMemo(() => [
    { studentId: "rabbit", question: preparedQuestion || questions[0], feedback: "原来不是‘铁会浮’，而是船身的形状让它排开了更多水。我懂了！", questionAudio: "/assets/audio/rabbit-question.m4a", feedbackAudio: "/assets/audio/rabbit-feedback.m4a" },
    { studentId: "panda", question: questions[1], feedback: "也就是说，空气变少以后，船排开的水也会变化，所以更容易沉下去。对吗？", questionAudio: "/assets/audio/panda-question.m4a", feedbackAudio: "/assets/audio/panda-feedback.m4a" },
    { studentId: "kitten", question: questions[2], feedback: "我明白了，判断浮力不能只看材料，还要看物体排开了多少水。", questionAudio: "/assets/audio/kitten-question.m4a", feedbackAudio: "/assets/audio/kitten-feedback.m4a" },
  ], [preparedQuestion]);
  const [dialogueTurns, setDialogueTurns] = useState(() => fallbackTurns);
  const activeTurn = dialogueTurns[turn] || fallbackTurns[turn];
  const selected = students.find((student) => student.id === activeTurn.studentId) || students[0];
  const completedStudentIds = dialogueTurns.slice(0, phase === "feedback" ? turn + 1 : turn).map((item) => item.studentId);
  const missionStep = phase === "lecture" ? 0 : Math.min(turn + 1, 3);
  const progressPercent = phase === "lecture" ? 58 : Math.min(96, 68 + turn * 10 + (phase === "feedback" ? 6 : 0));
  const canRespond = Boolean(answer.trim() || hasSpoken);
  const missionTasks = ["把浮力讲给全班听", "回答第一次提问", "接住学生的追问", "完成三轮课堂对话"];

  useEffect(() => { if (!recording) return undefined; const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(timer); }, [recording]);
  useEffect(() => {
    if (phase === "lecture" || !window.matchMedia("(max-width: 860px)").matches) return;
    classroomStageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase, turn]);
  useEffect(() => {
    const log = dialogueLogRef.current;
    log?.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }, [dialogueHistory]);
  useEffect(() => () => {
    studentVoiceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const appendDialogue = (...entries) => {
    setDialogueHistory((current) => [...current, ...entries.map((entry) => ({ ...entry, id: ++historyIdRef.current }))]);
  };

  const stopStudentSpeech = () => {
    if (studentAudioRef.current) {
      studentAudioRef.current.pause();
      studentAudioRef.current.currentTime = 0;
      studentAudioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setVoiceLoading(false);
  };

  const playStudentSpeech = async () => {
    if (phase === "lecture") return;
    stopStudentSpeech();
    const text = phase === "question" ? activeTurn.question : activeTurn.feedback;
    let audioPath = phase === "question" ? activeTurn.questionAudio : activeTurn.feedbackAudio;
    setVoiceLoading(true);
    const speechSource = phase === "question" ? activeTurn.questionSource : activeTurn.feedbackSource;
    if (speechSource === "model") {
      const voiceKey = `${selected.id}:${text}`;
      try {
        if (!studentVoiceUrlsRef.current.has(voiceKey)) studentVoiceUrlsRef.current.set(voiceKey, await createStudentVoice(text));
        audioPath = studentVoiceUrlsRef.current.get(voiceKey);
      } catch {
        audioPath = "";
      }
    }
    const audio = new window.Audio(audioPath);
    let fallbackStarted = false;
    const playNativeFallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      studentAudioRef.current = null;
      setVoiceLoading(false);
      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        setSpeaking(false);
        return;
      }
      const utterance = new window.SpeechSynthesisUtterance(text);
      const voice = window.speechSynthesis.getVoices().find((item) => item.lang?.toLowerCase().startsWith("zh"));
      if (voice) utterance.voice = voice;
      utterance.lang = "zh-CN";
      utterance.rate = .94;
      utterance.pitch = { rabbit: 1.22, panda: .92, kitten: 1.1 }[selected.id] || 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };
    studentAudioRef.current = audio;
    audio.onplay = () => {
      setVoiceLoading(false);
      setSpeaking(true);
    };
    audio.onended = () => {
      studentAudioRef.current = null;
      setSpeaking(false);
    };
    audio.onerror = playNativeFallback;
    if (!audioPath) {
      playNativeFallback();
      return;
    }
    audio.play().catch(playNativeFallback);
  };

  useEffect(() => {
    if (phase === "lecture") return undefined;
    const timer = window.setTimeout(playStudentSpeech, 180);
    return () => {
      window.clearTimeout(timer);
      if (studentAudioRef.current) {
        studentAudioRef.current.pause();
        studentAudioRef.current = null;
      }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [phase, turn]);

  const toggleRecording = () => {
    if (phase === "feedback" || modelThinking) return;
    stopStudentSpeech();
    if (recording) {
      setRecording(false);
      setHasSpoken(true);
      return;
    }
    setSeconds(0);
    setRecording(true);
  };

  const requestQuestion = async (teacherText, targetTurn) => {
    const fallback = fallbackTurns[targetTurn];
    try {
      const result = await askModel({
        kind: "teach",
        action: "question",
        text: teacherText,
        history: dialogueHistory,
        excludedStudentIds: dialogueTurns.slice(0, targetTurn).map((item) => item.studentId),
      });
      setModelMode("online");
      return { ...fallback, studentId: result.studentId, question: result.question, questionSource: "model" };
    } catch {
      setModelMode("offline");
      return fallback;
    }
  };

  const requestFeedback = async (teacherText) => {
    try {
      const result = await askModel({
        kind: "teach",
        action: "feedback",
        text: teacherText,
        studentId: activeTurn.studentId,
        question: activeTurn.question,
        history: dialogueHistory,
      });
      setModelMode("online");
      return { text: result.feedback, source: "model" };
    } catch {
      setModelMode("offline");
      return { text: activeTurn.feedback, source: "offline" };
    }
  };

  const advanceDialogue = async () => {
    if (modelThinking || (phase !== "feedback" && !canRespond)) return;
    stopStudentSpeech();
    if (phase === "feedback") {
      if (turn < dialogueTurns.length - 1) {
        setModelThinking(true);
        const latestTeacherText = [...dialogueHistory].reverse().find((entry) => entry.role === "teacher")?.text || data.prepDraft?.concept || "我讲解了浮力。";
        const nextTurnIndex = turn + 1;
        const nextTurn = await requestQuestion(latestTeacherText, nextTurnIndex);
        setDialogueTurns((current) => current.map((item, index) => index === nextTurnIndex ? nextTurn : item));
        const nextStudent = students.find((student) => student.id === nextTurn.studentId) || students[0];
        appendDialogue({ role: "student", studentId: nextStudent.id, speaker: `${nextStudent.name}追问`, text: nextTurn.question });
        setTurn(nextTurnIndex);
        setPhase("question");
        setModelThinking(false);
        return;
      }
      finishLesson();
      return;
    }

    const spokenText = answer.trim() || `完成了一段 ${seconds || 1} 秒的口头${phase === "lecture" ? "讲解" : "回答"}`;
    setRecording(false);
    setAnswer("");
    setSeconds(0);
    setHasSpoken(false);
    if (phase === "lecture") {
      setModelThinking(true);
      const generatedTurn = await requestQuestion(spokenText, 0);
      setDialogueTurns((current) => current.map((item, index) => index === 0 ? generatedTurn : item));
      const askingStudent = students.find((student) => student.id === generatedTurn.studentId) || students[0];
      appendDialogue(
        { role: "teacher", speaker: "我讲解", text: spokenText },
        { role: "student", studentId: askingStudent.id, speaker: `${askingStudent.name}提问`, text: generatedTurn.question },
      );
      setPhase("question");
      setModelThinking(false);
      return;
    }
    if (phase === "question") {
      setModelThinking(true);
      const generatedFeedback = await requestFeedback(spokenText);
      setDialogueTurns((current) => current.map((item, index) => index === turn ? { ...item, feedback: generatedFeedback.text, feedbackSource: generatedFeedback.source } : item));
      appendDialogue(
        { role: "teacher", speaker: "我回答", text: spokenText },
        { role: "student", studentId: selected.id, speaker: `${selected.name}回应`, text: generatedFeedback.text, feedback: true },
      );
      setPhase("feedback");
      setModelThinking(false);
      return;
    }
  };

  const micLabel = recording ? (phase === "lecture" ? "结束讲解" : "结束回答") : (phase === "lecture" ? "开始讲解" : "开始回答");
  const nextLabel = modelThinking ? "学生正在想" : phase === "lecture" ? "讲完了，听提问" : phase === "question" ? "回答完成" : turn < dialogueTurns.length - 1 ? "听下一个问题" : "完成课堂";
  const statusLabel = modelThinking ? "动物同学正在认真想" : recording ? "全班正在认真听" : phase === "lecture" ? "先把浮力讲给全班听" : phase === "question" ? `${selected.name}在等你的回答` : `${selected.name}听懂了，并回应了你`;
  const statusDetail = phase === "lecture" ? "开场讲解" : `第 ${turn + 1}/3 轮对话`;

  return (
    <div className="teach-page">
      <header className="topbar teach-topbar">
        <div className="brand-lockup">
          <button className="teach-back" type="button" onClick={() => navigate("/classroom")} aria-label="返回教室" title="返回教室"><ArrowLeft weight="bold" /></button>
          <img className="teacher-avatar" src="/assets/teacher-avatar.png" alt="小林老师的像素头像" />
          <div><strong>TeenyTeach</strong><span>{data.className} · 正在上课</span></div>
        </div>
        <div className="class-growth">
          <div className="growth-title"><span>课堂对话 · {statusDetail}</span><b>{progressPercent}%</b></div>
          <div className="pixel-progress"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
        <div className="resource-bar">
          <div className="resource"><Lightning weight="fill" /><b>86</b></div>
          <div className="resource"><Coin weight="fill" /><b>{data.totalXp.toLocaleString()}</b></div>
          <button className="icon-button" type="button" onClick={() => navigate("/classroom")} aria-label="离开课堂" title="离开课堂"><House weight="fill" /></button>
        </div>
      </header>

      <main className="lesson-layout">
        <aside className="mission-panel" aria-label="课堂对话任务">
          <div className="panel-heading"><span className="heading-icon"><BookOpenText weight="fill" /></span><div><small>今日课堂任务</small><h1>讲清楚浮力</h1></div></div>
          <div className="mission-note">{data.prepDraft?.concept || "让每位同学都能用自己的话，说出物体浮沉的秘密。"}</div>
          <ol className="task-list">
            {missionTasks.map((task, index) => {
              const status = index < missionStep ? "done" : index === missionStep ? "active" : "locked";
              return <li key={task} className={status}><span className="task-marker">{status === "done" ? <Check weight="bold" /> : index + 1}</span><div><b>{task}</b><small>{status === "active" ? "正在进行" : status === "done" ? "已经完成" : "等待对话"}</small></div></li>;
            })}
          </ol>
          <div className="reward-strip"><span><Trophy weight="fill" /></span><div><small>完成奖励</small><b>班级成长 +120</b></div></div>
        </aside>

        <section ref={classroomStageRef} className="classroom-stage" aria-label="像素动物课堂">
          <ClassroomScene
            step={phase === "lecture" ? 0 : turn + 1}
            activeState={phase === "question" ? "asking" : phase === "feedback" ? "happy" : ""}
            recording={recording}
            selectedStudent={phase === "lecture" ? "" : selected.id}
            completedStudentIds={completedStudentIds}
          />
          {phase !== "lecture" && (
            <div className={`question-bubble ${phase === "feedback" ? "feedback" : ""}`} role="status">
              <img src={selected.sprite} alt="" />
              <div><small>{phase === "question" ? `${selected.name}举手提问` : `${selected.name}听懂后回应`}</small><p>{phase === "question" ? activeTurn.question : activeTurn.feedback}</p></div>
              <button className={`student-voice-button ${speaking ? "speaking" : ""} ${voiceLoading ? "loading" : ""}`} type="button" disabled={voiceLoading} onClick={speaking ? stopStudentSpeech : playStudentSpeech} aria-label={speaking ? "停止学生语音" : voiceLoading ? "正在生成学生语音" : "播放学生语音"} title={speaking ? "停止语音" : voiceLoading ? "正在生成语音" : "重新播放"}>{speaking ? <Pause weight="fill" /> : voiceLoading ? <Clock weight="fill" /> : <SpeakerHigh weight="fill" />}<span>{speaking ? "停止" : voiceLoading ? "生成中" : "播放"}</span></button>
            </div>
          )}
          <div className="lesson-status"><span className="live-dot" /><b>{statusLabel}</b><span>{recording ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` : `${statusDetail} · ${modelMode === "online" ? "千问在线" : modelMode === "offline" ? "离线引导" : "AI 准备就绪"}`}</span></div>
          <div className="teacher-console">
            <div className="answer-console">
              <button className={`mic-button ${recording ? "recording" : ""}`} type="button" disabled={phase === "feedback" || modelThinking} aria-label={micLabel} onClick={toggleRecording}>{recording ? <Pause weight="fill" /> : <Microphone weight="fill" />}<span>{micLabel}</span></button>
              <label className="text-answer"><input value={answer} disabled={phase === "feedback" || modelThinking} onChange={(event) => setAnswer(event.target.value)} placeholder={modelThinking ? "动物同学正在想……" : phase === "lecture" ? "也可以打字讲解浮力……" : phase === "question" ? `回答${selected.name}的问题……` : "学生正在回应你……"} /><button type="button" aria-label="发送本轮回答" disabled={phase === "feedback" || modelThinking || !answer.trim()} onClick={advanceDialogue}><PaperPlaneTilt weight="fill" /></button></label>
            </div>
            <button className="next-button" type="button" disabled={modelThinking || (phase !== "feedback" && !canRespond)} onClick={advanceDialogue}>{phase === "feedback" && turn === dialogueTurns.length - 1 ? <Sparkle weight="fill" /> : <Play weight="fill" />}<span>{nextLabel}</span></button>
          </div>
        </section>

        <aside className="dialogue-panel" aria-label="课堂对话记录">
          <header className="dialogue-panel-header"><span><BookOpenText weight="fill" /></span><div><small>本堂课</small><h2>对话记录</h2></div><b>{dialogueHistory.length}</b></header>
          <div ref={dialogueLogRef} className="dialogue-log" aria-live="polite">
            {dialogueHistory.length === 0 && <div className="dialogue-empty"><Microphone weight="fill" /><b>还没有发言</b><p>完成开场讲解后，你和学生说过的话都会留在这里。</p></div>}
            {dialogueHistory.map((entry) => {
              const student = entry.studentId ? students.find((item) => item.id === entry.studentId) : null;
              return (
                <article className={`dialogue-entry ${entry.role} ${entry.feedback ? "feedback" : ""}`} key={entry.id}>
                  <img src={entry.role === "teacher" ? "/assets/teacher-avatar.png" : student?.image} alt="" />
                  <div><small>{entry.speaker}</small><p>{entry.text}</p></div>
                </article>
              );
            })}
          </div>
          <footer><span className="live-dot" /><b>{phase === "lecture" ? "等待你的开场讲解" : phase === "question" ? `正在回答${selected.name}` : `${selected.name}刚刚回应了你`}</b></footer>
        </aside>
      </main>
    </div>
  );
}

function ResultRoom({ data, navigate }) {
  const [openEvidence, setOpenEvidence] = useState("concept");
  const [reviewOpen, setReviewOpen] = useState(false);
  const score = data.lastResult?.score || data.bestScore || 88;
  return (
    <main className="page-shell result-page">
      <section className="result-hero">
        <div className="result-hero-copy">
          <p className="eyebrow"><SealCheck weight="fill" />课堂已完成 · 浮力</p>
          <h1>这节课，<em>全班都进步了</em></h1>
          <p>你不是得到了一个分数，而是留下了四条可以继续变好的证据。</p>
          <div className="score-orbit"><div><span>本次课堂</span><strong>{score}</strong><small>综合反馈</small></div><span className="score-star"><Star weight="fill" /></span></div>
          <div className="result-actions"><button className="primary-command" type="button" onClick={() => navigate("/leaderboard")}><ChartBar weight="fill" />进入班级榜 <ArrowRight weight="bold" /></button><button className="secondary-command" type="button" onClick={() => navigate("/prep/science-buoyancy-01")}><NotePencil weight="fill" />准备下一课</button></div>
        </div>
        <div className="result-visual" aria-label="六位学生的课堂成长">
          <div className="result-board">
            <span><Trophy weight="fill" />本节课总结</span>
            <strong>全班进步 <em>+18</em></strong>
            <div className="result-mini-scores">{scoring.slice(0, 3).map((item) => <span key={item.key}><b>{item.label}</b><i><em style={{ width: `${item.score}%`, background: item.color }} /></i><strong>{item.score}</strong></span>)}</div>
          </div>
          <div className="celebration-class">{students.map((student, index) => <div className={`celebration-student student-${index + 1}`} key={student.id}><img src={student.image} alt={`${student.species}${student.name}`} /><span><b>{student.name}</b><small>+{[18, 16, 15, 14, 12, 10][index]}</small></span></div>)}</div>
          <div className="result-stamp"><Trophy weight="fill" /><span><b>班级成长</b><strong>+120 XP</strong></span></div>
        </div>
      </section>

      <section className="result-band">
        <div className="band-title"><div><span className="section-kicker">可解释反馈</span><h2>四个维度，告诉你为什么</h2></div><span className="score-note"><ShieldCheck weight="fill" />不是考试成绩，是教学反馈</span></div>
        <div className="score-list">{scoring.map((item) => <div className={`score-row ${openEvidence === item.key ? "expanded" : ""}`} key={item.key}><button type="button" onClick={() => setOpenEvidence((value) => value === item.key ? "" : item.key)}><span className="score-label"><i style={{ background: item.color }} /><b>{item.label}</b></span><span className="score-track"><i style={{ width: `${item.score}%`, background: item.color }} /></span><strong>{item.score}</strong><CaretRight weight="bold" /></button>{openEvidence === item.key && <p><CheckCircle weight="fill" />{item.evidence}</p>}</div>)}</div>
      </section>

      <section className="result-grid">
        <div className="growth-panel"><div className="band-title"><div><span className="section-kicker">六位学生的变化</span><h2>他们具体听懂了什么</h2></div></div><div className="growth-list">{students.map((student, index) => <div className="growth-row" key={student.id}><img src={student.image} alt={`${student.species}${student.name}`} /><span><b>{student.name}</b><small>{["知道浮力方向向上了", "能把定义用在新例子里", "发现形状也会影响浮沉", "开始主动找反例", "分清了重量和浮力", "愿意用实验验证"][index]}</small></span><strong>+{[18, 16, 15, 14, 12, 10][index]}</strong></div>)}</div></div>
        <div className="review-panel"><div className="band-title"><div><span className="section-kicker">课后复盘</span><h2>再看一眼学生的问题</h2></div></div><button className="review-toggle" type="button" onClick={() => setReviewOpen((value) => !value)}><span><Question weight="fill" /><b>小白：铁船为什么不会沉？</b></span><CaretDown weight="bold" /></button>{reviewOpen && <div className="review-copy"><p>你的第一次回答说到了“空气”，补充讲解时又加上了“形状”和“排开水的多少”，所以小白从“困惑”变成了“能举例”。</p><span><ArrowUp weight="bold" />下一次可以先说结论，再用例子证明。</span></div>}<button className="review-action" type="button" onClick={() => setReviewOpen(true)}><BookOpenText weight="fill" />打开复盘笔记</button></div>
      </section>
    </main>
  );
}

function Leaderboard({ data, navigate }) {
  const [tab, setTab] = useState("province");
  const [region, setRegion] = useState(data.region || "浙江省");
  const rows = tab === "province" ? rankingRows : rankingRows.map((row, index) => ({ ...row, score: Math.max(82, row.score - index * 2), rank: index + 1, region: index % 2 ? "浙江省" : row.region }));
  return (
    <main className="page-shell leaderboard-page"><section className="leaderboard-header"><div><p className="eyebrow"><ChartBar weight="fill" />班级排行榜</p><h1>看看大家把课讲到哪里了</h1><p>这是匿名虚拟班级的教学表现榜，不是真实考试成绩。</p></div><div className="leaderboard-position"><span>你的班级</span><b>{data.hasClass ? data.className : "浮力小队"}</b><strong>{data.bestScore || "--"}<small>分</small></strong><span>{data.region} · 完成第一堂课后正式登榜</span></div></section><section className="leaderboard-band"><div className="leaderboard-tools"><div className="leader-tabs"><button className={tab === "province" ? "active" : ""} type="button" onClick={() => setTab("province")}><MapPin weight="fill" />省级榜</button><button className={tab === "national" ? "active" : ""} type="button" onClick={() => setTab("national")}><GlobeHemisphereWest weight="fill" />全国榜</button></div><label className="region-filter"><MapPin weight="fill" /><select value={region} onChange={(event) => setRegion(event.target.value)}><option>浙江省</option><option>江苏省</option><option>广东省</option><option>四川省</option><option>上海市</option><option>山东省</option></select><CaretDown weight="bold" /></label></div><div className="leaderboard-note"><ShieldCheck weight="fill" /><span><b>榜单说明</b>榜单对象是匿名虚拟班级；同分并列，不按答题速度排序。每 5 分钟最多提交一次有效成绩。</span></div>{data.hasClass && <div className="current-rank-row"><span><Crown weight="fill" /><b>你的班级 · {data.className}</b></span><span>{data.bestScore ? `最佳 ${data.bestScore} 分` : "完成一堂课后登榜"}</span></div>}<div className="ranking-list">{rows.map((row) => <div className={`ranking-row ${row.name === data.className ? "current" : ""}`} key={`${tab}-${row.rank}`}><span className={`rank-number rank-${row.rank}`}>{row.rank <= 3 ? <Medal weight="fill" /> : row.rank}</span><span className="rank-name"><b>{row.name}</b><small>{row.region} · {row.badge}</small></span><strong>{row.score}<small>分</small></strong><span className={`rank-delta ${row.delta > 0 ? "up" : ""}`}>{row.delta > 0 ? <><ArrowUp weight="bold" />{row.delta}</> : row.delta === 0 ? "—" : row.delta}</span></div>)}</div><div className="leaderboard-empty"><UsersThree weight="fill" /><span><b>还想超过更多班级？</b><small>带好下一堂课，最高分会自动更新。</small></span><button className="secondary-command" type="button" onClick={() => navigate("/prep/science-buoyancy-01")}>去备课 <ArrowRight weight="bold" /></button></div></section></main>
  );
}

function PrivacyPage({ data, navigate, onClear }) {
  return (
    <main className="page-shell privacy-page"><section className="privacy-header"><button className="back-link" type="button" onClick={() => navigate("/classroom")}><ArrowLeft weight="bold" />返回教室</button><p className="eyebrow"><ShieldCheck weight="fill" />隐私与产品边界</p><h1>让孩子玩得明白，也让家长看得明白</h1><p>TeenyTeach 是一款角色扮演式主动学习游戏。它记录的是匿名班级的游戏反馈，不替代老师、家长或正式教育评价。</p></section><section className="privacy-grid"><div className="privacy-main"><PrivacyRow icon={<UserCircle weight="fill" />} title="不需要真实身份" text="不收集真实姓名、学校、城市、联系方式或头像照片。班级只用一个你自己保存的班级码恢复。" /><PrivacyRow icon={<BookOpen weight="fill" />} title="课堂文字只为复盘" text="你主动提交的讲解文字用于本轮课堂分析和复盘，原始语音不在这个演示版本里保存。" /><PrivacyRow icon={<ChartBar weight="fill" />} title="排行榜是虚拟班级榜" text="只展示匿名班级名、省份和分数，不展示个人成绩。排行榜是教学表现游戏反馈，不是考试排名。" /><PrivacyRow icon={<Target weight="fill" />} title="学生状态不是诊断" text="六位动物学生的“听懂了/思考中”只描述本轮课堂节奏，不代表真实孩子的能力、智力或学习等级。" /></div><aside className="privacy-side"><div className="privacy-card"><span className="modal-badge"><LockKey weight="fill" /></span><h2>你的班级码</h2><code>{data.classCode}</code><p>把它记在安全的地方。它不显示在公开排行榜里。</p><button className="copy-code" type="button" onClick={() => navigator.clipboard?.writeText(data.classCode)}><CheckCircle weight="fill" />复制班级码</button></div><div className="privacy-card danger-card"><Trash weight="fill" /><h2>清除本地数据</h2><p>删除当前设备上的班级、课堂记录和班级码。</p><button className="modal-danger" type="button" onClick={onClear}>清除我的班级</button></div></aside></section></main>
  );
}

function PrivacyRow({ icon, title, text }) {
  return <article className="privacy-row"><span className="privacy-icon">{icon}</span><div><h2>{title}</h2><p>{text}</p></div><CheckCircle weight="fill" /></article>;
}

function SettingsDialog({ quietMode, setQuietMode, onClose, onPrivacy, onClear }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="pixel-modal settings-dialog" role="dialog" aria-modal="true" aria-label="设置" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="关闭" title="关闭" onClick={onClose}><X weight="bold" /></button><span className="modal-badge"><GearSix weight="fill" /></span><h2>课堂设置</h2><div className="settings-list"><button type="button"><SpeakerHigh weight="fill" /><span><b>课堂音效</b><small>像素按钮音和学生反馈</small></span><i className="toggle on" /></button><button type="button" onClick={() => setQuietMode((value) => !value)}><ShieldCheck weight="fill" /><span><b>减少动态</b><small>保留状态变化，关闭移动动画</small></span><i className={`toggle ${quietMode ? "on" : ""}`} /></button><button type="button" onClick={onPrivacy}><LockKey weight="fill" /><span><b>隐私与产品边界</b><small>看看班级数据如何使用</small></span><CaretRight weight="bold" /></button><button type="button" onClick={onClear}><Trash weight="fill" /><span><b>清除本地班级</b><small>删除当前设备保存的数据</small></span><CaretRight weight="bold" /></button></div><button className="modal-primary" type="button" onClick={onClose}>保存设置</button></section></div>;
}
