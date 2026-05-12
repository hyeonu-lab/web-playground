import { useEffect, useMemo, useRef, useState } from "react";

const PINBALL_LIMIT = 10;
const DEFAULT_ITEMS = ["김민서", "이서준", "박지우", "최하린", "정도윤", "발표 1모둠"];

function shuffleList(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function parseItems(value, limit = Infinity) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function range(count) {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function Header({ current }) {
  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="교실도구 홈">
        <span className="brand-mark" aria-hidden="true">A</span>
        <span>교실도구</span>
      </a>

      <nav className="site-nav" aria-label="주요 기능">
        <a href="#/seat-chart" aria-current={current === "seat-chart" ? "page" : undefined}>
          자리바꾸기
        </a>
        <a href="#/pinball-draw" aria-current={current === "pinball-draw" ? "page" : undefined}>
          룰렛
        </a>
        <a href="#/pinball-draw" aria-current={current === "ladder" ? "page" : undefined}>
          사다리타기
        </a>
        <a href="#/pinball-draw" aria-current={current === "draw" ? "page" : undefined}>
          핀볼 추첨기
        </a>
      </nav>
    </header>
  );
}

function Home() {
  return (
    <>
      <Header current="home" />
      <main className="home-main">
        <section className="home-panel">
          <p className="eyebrow">Classroom activity tools</p>
          <h1>교실에서 바로 쓰는 활동 도구</h1>
          <p>자리바꾸기와 추첨 도구를 빠르게 실행할 수 있습니다.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#/seat-chart">자리바꾸기 열기</a>
            <a className="secondary-button" href="#/pinball-draw">핀볼 추첨기 열기</a>
          </div>
        </section>
      </main>
    </>
  );
}

function SeatChart() {
  const [classTitle, setClassTitle] = useState("");
  const [groupCount, setGroupCount] = useState(2);
  const [groupCols, setGroupCols] = useState(2);
  const [groupRows, setGroupRows] = useState(5);
  const capacity = groupCount * groupCols * groupRows;
  const [seats, setSeats] = useState(() => range(20));

  useEffect(() => {
    setSeats((current) => {
      const next = current.slice(0, capacity);
      while (next.length < capacity) next.push(next.length + 1);
      return next;
    });
  }, [capacity]);

  const groups = useMemo(() => {
    const perGroup = groupCols * groupRows;
    return range(groupCount).map((groupIndex) => {
      const start = (groupIndex - 1) * perGroup;
      return seats.slice(start, start + perGroup);
    });
  }, [groupCols, groupCount, groupRows, seats]);

  function clampNumber(value, min, max) {
    const next = Number(value);
    if (Number.isNaN(next)) return min;
    return Math.min(max, Math.max(min, next));
  }

  function shuffleSeats() {
    setSeats(shuffleList(range(capacity)));
  }

  function resetSeats() {
    setClassTitle("");
    setGroupCount(2);
    setGroupCols(2);
    setGroupRows(5);
    setSeats(range(20));
  }

  return (
    <>
      <Header current="seat-chart" />
      <main className="seat-page">
        <section className="classroom-stage" aria-label="자리 배치 결과">
          <div className="chalkboard">
            {classTitle.trim() || "학급 명을 입력해주세요"}
          </div>

          <div className="teacher-area" aria-label="교탁">
            <div className="teacher-bear" aria-hidden="true">
              <span className="ear left"></span>
              <span className="ear right"></span>
              <span className="face">●ᴥ●</span>
            </div>
            <strong>교탁</strong>
          </div>

          <div
            className="seat-groups"
            style={{
              "--group-count": groupCount,
              "--group-cols": groupCols,
            }}
          >
            {groups.map((groupSeats, groupIndex) => (
              <section className="seat-group" key={groupIndex}>
                <h2>{groupIndex + 1}분단</h2>
                <div className="desk-grid">
                  {groupSeats.map((seat) => (
                    <div className="desk" key={`${groupIndex}-${seat}`}>
                      <span>{seat}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <aside className="side-panel planner-panel">
          <p className="eyebrow">Classroom planner</p>
          <h1>자리바꾸기</h1>

          <label className="field">
            <span>반 제목</span>
            <input
              value={classTitle}
              placeholder="학급 명을 입력해주세요"
              onChange={(event) => setClassTitle(event.target.value)}
            />
          </label>

          <div className="number-grid">
            <label className="field">
              <span>분단 개수</span>
              <input
                type="number"
                min="1"
                max="6"
                value={groupCount}
                onChange={(event) => setGroupCount(clampNumber(event.target.value, 1, 6))}
              />
            </label>
            <label className="field">
              <span>분단 열</span>
              <input
                type="number"
                min="1"
                max="4"
                value={groupCols}
                onChange={(event) => setGroupCols(clampNumber(event.target.value, 1, 4))}
              />
            </label>
            <label className="field">
              <span>분단 행</span>
              <input
                type="number"
                min="1"
                max="8"
                value={groupRows}
                onChange={(event) => setGroupRows(clampNumber(event.target.value, 1, 8))}
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" type="button" onClick={shuffleSeats}>
              자리 섞기
            </button>
            <button className="secondary-button" type="button" onClick={() => window.print()}>
              인쇄
            </button>
            <button className="secondary-button" type="button" onClick={resetSeats}>
              초기화
            </button>
          </div>

          <p className="status-note">
            책상 {capacity}개에 맞춰 학생 {capacity}명이 자동으로 배치되었습니다.
          </p>

          <section className="help-copy">
            <h2>교실 자리바꾸기 도구</h2>
            <p>
              분단 수와 좌석 행, 열을 정하면 학생 자리를 자동으로 맞춰 배치합니다.
              자리 섞기 버튼으로 무작위 자리바꾸기를 실행하고, 결과를 자리배치표로
              인쇄할 수 있습니다.
            </p>
            <p>
              학급 자리 바꾸기, 모둠 자리 배치, 교실 좌석표 만들기에 사용할 수 있습니다.
            </p>
          </section>
        </aside>
      </main>
    </>
  );
}

function PinballDraw() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const [input, setInput] = useState(DEFAULT_ITEMS.join("\n"));
  const [winner, setWinner] = useState("대기 중");
  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);
  const items = useMemo(() => parseItems(input, PINBALL_LIMIT), [input]);

  useEffect(() => {
    drawBoard(canvasRef.current, items);
  }, [items]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function handleDraw() {
    if (running || items.length === 0) return;
    const result = items[Math.floor(Math.random() * items.length)];
    setRunning(true);
    setWinner("굴러가는 중");
    animateBall(canvasRef.current, items, result, frameRef, () => {
      setWinner(result);
      setHistory((current) => [result, ...current].slice(0, 8));
      setRunning(false);
    });
  }

  return (
    <>
      <Header current="pinball-draw" />
      <main className="pinball-page">
        <section className="page-title">
          <div>
            <p className="eyebrow">Pinball draw</p>
            <h1>핀볼 추첨기</h1>
            <p>목록을 입력하고 공을 떨어뜨려 무작위로 하나를 뽑습니다.</p>
          </div>
          <div className="winner-card" aria-live="polite">
            <span>추첨 결과</span>
            <strong>{winner}</strong>
          </div>
        </section>

        <section className="pinball-layout">
          <section className="machine-shell" aria-label="핀볼 추첨 애니메이션">
            <canvas ref={canvasRef} width="820" height="900" />
          </section>

          <aside className="side-panel">
            <label className="field">
              <span>추첨 목록</span>
              <textarea
                spellCheck="false"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
            </label>
            <div className="button-row two-col">
              <button className="secondary-button" type="button" onClick={() => setInput(shuffleList(items).join("\n"))}>
                목록 섞기
              </button>
              <button className="primary-button" type="button" onClick={handleDraw} disabled={running || items.length === 0}>
                추첨 시작
              </button>
            </div>
            <section className="history-panel">
              <div className="history-heading">
                <h2>추첨 기록</h2>
                <button type="button" onClick={() => setHistory([])}>초기화</button>
              </div>
              {history.length === 0 ? <p>아직 추첨 기록이 없습니다.</p> : (
                <ol>
                  {history.map((name, index) => (
                    <li key={`${name}-${index}`}>{name}</li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </section>
      </main>
    </>
  );
}

function drawBoard(canvas, labels, ball = null, activeSlot = -1) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const board = { left: 70, right: width - 70, top: 92, slotTop: height - 158 };

  ctx.clearRect(0, 0, width, height);
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#fff9ed");
  background.addColorStop(1, "#ead1ad");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#315f44";
  roundRect(ctx, 36, 30, width - 72, height - 60, 28);
  ctx.fill();

  ctx.fillStyle = "#f8edd8";
  roundRect(ctx, board.left, board.top, board.right - board.left, board.slotTop - board.top + 126, 22);
  ctx.fill();

  ctx.fillStyle = "#244a36";
  ctx.font = "900 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PINBALL DRAW", width / 2, 70);

  buildPins(board).forEach((pin) => {
    const hit = ball && Math.hypot(ball.x - pin.x, ball.y - pin.y) < 32;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, hit ? 10 : 7, 0, Math.PI * 2);
    ctx.fillStyle = hit ? "#f4c95d" : "#d69a5b";
    ctx.fill();
    ctx.strokeStyle = "#6b432c";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  const slotLabels = labels.length > 0 ? labels : ["목록을 입력하세요"];
  const slotCount = Math.min(Math.max(slotLabels.length, 2), PINBALL_LIMIT);
  const slotWidth = (board.right - board.left) / slotCount;

  for (let index = 0; index < slotCount; index += 1) {
    const x = board.left + slotWidth * index;
    ctx.fillStyle = index === activeSlot ? "#f4c95d" : index % 2 === 0 ? "#dfead4" : "#fff4c7";
    ctx.fillRect(x, board.slotTop, slotWidth, 112);
    ctx.strokeStyle = "rgba(107, 67, 44, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, board.slotTop, slotWidth, 112);
    ctx.fillStyle = "#2f241a";
    ctx.font = "800 17px system-ui, sans-serif";
    wrapText(ctx, slotLabels[index % slotLabels.length], x + slotWidth / 2, board.slotTop + 36, slotWidth - 16, 20);
  }

  drawBall(ctx, ball?.x ?? width / 2, ball?.y ?? 108, ball ? 1 : 0.45);
}

function buildPins(board) {
  const pins = [];
  for (let row = 0; row < 9; row += 1) {
    const count = row % 2 === 0 ? 7 : 8;
    const y = board.top + 90 + row * 58;
    const startX = (board.left + board.right) / 2 - ((count - 1) * 74) / 2;
    for (let col = 0; col < count; col += 1) {
      pins.push({ x: startX + col * 74, y });
    }
  }
  return pins;
}

function animateBall(canvas, labels, winner, frameRef, onDone) {
  if (!canvas) {
    onDone();
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const board = { left: 70, right: width - 70, top: 92, slotTop: height - 158 };
  const slotCount = Math.min(Math.max(labels.length, 2), PINBALL_LIMIT);
  const slotIndex = Math.max(0, labels.findIndex((label) => label === winner));
  const slotWidth = (board.right - board.left) / slotCount;
  const endX = board.left + slotWidth * slotIndex + slotWidth / 2;
  const endY = board.slotTop + 82;
  const pins = buildPins(board);
  const path = [
    { x: width / 2, y: 108 },
    ...pins.filter((_, index) => index % 7 === 0).map((pin, index) => ({
      x: pin.x + (index % 2 === 0 ? 34 : -34),
      y: pin.y + 18,
    })),
    { x: endX, y: endY },
  ];
  const start = performance.now();
  const duration = 2400;

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const scaled = progress * (path.length - 1);
    const index = Math.min(Math.floor(scaled), path.length - 2);
    const local = scaled - index;
    const current = path[index];
    const next = path[index + 1];
    const bounce = Math.sin(local * Math.PI) * 18;
    const ball = {
      x: current.x + (next.x - current.x) * local,
      y: current.y + (next.y - current.y) * local - bounce,
    };

    drawBoard(canvas, labels, ball, progress === 1 ? slotIndex : -1);

    if (progress < 1) {
      frameRef.current = requestAnimationFrame(frame);
      return;
    }

    frameRef.current = null;
    onDone();
  }

  cancelAnimationFrame(frameRef.current);
  frameRef.current = requestAnimationFrame(frame);
}

function drawBall(ctx, x, y, opacity) {
  const gradient = ctx.createRadialGradient(x - 7, y - 8, 2, x, y, 22);
  gradient.addColorStop(0, "#fffdf7");
  gradient.addColorStop(0.34, "#f4c95d");
  gradient.addColorStop(1, "#b66f36");
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.shadowColor = "rgba(182, 111, 54, 0.48)";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = "";
  let lineIndex = 0;

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
      return;
    }
    line = next;
  });

  ctx.fillText(line, x, y + lineIndex * lineHeight);
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\/?/, "") || "seat-chart");

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash.replace(/^#\/?/, "") || "seat-chart");
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  useEffect(() => {
    const titles = {
      home: "교실도구",
      "seat-chart": "자리바꾸기 - 교실도구",
      "pinball-draw": "핀볼 추첨기 - 교실도구",
    };
    document.title = titles[route] ?? titles.home;
  }, [route]);

  if (route === "home") return <Home />;
  if (route === "pinball-draw") return <PinballDraw />;
  return <SeatChart />;
}

export default App;
