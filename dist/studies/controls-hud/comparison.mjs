const frame = document.querySelector('#game');
const status = document.querySelector('#status');
const playButton = document.querySelector('#play');
const sceneButton = document.querySelector('#scene');
const viewSelect = document.querySelector('#view');
const designComparison = document.body.dataset.comparison === 'designs';
const gtComparison = document.body.dataset.comparison === 'gt';
const variants = gtComparison ? {
  gt: {title:'도로에 집중하는 경주 화면',description:'순위와 진행은 왼쪽, 시간은 중앙, 코스는 오른쪽. 속도·기어·회전수와 페달 작동 상태는 아래 계기에 표시됩니다.',question:'코너에 들어가기 전에 브레이크를 누르고, 코너를 빠져나오며 가속해 보세요.'},
  digital: {title:'이전 디지털 레이싱형',description:'같은 코스와 입력 방식으로 이전 디자인을 비교합니다.',question:'새 화면과 번갈아 보며 코스 지도·계기·조작부의 가독성을 비교해 보세요.'}
} : designComparison ? {
  sport: { title: '정제된 스포츠카 장치형', description: '무광 금속 페달, 깊이 있는 조향 손잡이, 따뜻한 계기 조명. 입력량은 페달 안에서 읽고 속도와 기어는 하나의 계기로 묶었습니다.', question: '페달을 누르고 위아래로 움직여 보세요. 금속 면의 눌림과 옆의 표시선이 조작량을 자연스럽게 전달하는지 확인합니다.' },
  digital: { title: '간결한 디지털 레이싱형', description: '열린 숫자 배치와 얇은 입력 레일, 평면적인 조작 면. 중앙 시야를 비우고 가속·제동량은 해당 페달에서 바로 읽습니다.', question: '같은 코너에서 제동해 보세요. 도로와 속도가 잘 읽히면서도 손을 뗀 뒤 조작 위치를 쉽게 다시 찾을 수 있는지 비교합니다.' }
} : {
  classic: {
    title: '페달과 고정 계기',
    description: '짙은 그래파이트 페달, 분명한 조향 손잡이, 순위와 속도의 큰 숫자. 브레이크는 낮고 넓게, 가속은 길게 배치했습니다.',
    question: '밝은 노면에서도 페달의 경계가 보이는지, 가속에서 브레이크로 옮길 때 다시 내려다보게 되는지 비교해 보세요.'
  },
  minimal: {
    title: '간결한 화면',
    description: '조작부는 얇은 레일과 반투명 면으로 표시합니다. 순위·진행·속도를 우선하고, 시간은 일시정지 화면에서 확인합니다.',
    question: '도로와 상대 차량이 더 잘 보이는지, 손을 뗀 뒤에도 조작 위치를 쉽게 다시 찾을 수 있는지 살펴보세요.'
  },
  precision: {
    title: '입력량 조절',
    description: '페달 아래쪽은 약하게, 위쪽은 강하게 작동합니다. 누른 채 위아래로 움직여 0~100%를 조절하고, 손을 떼면 입력이 풀립니다.',
    question: '같은 코너에서 제동량을 조금씩 줄이고 가속량을 늘려 보세요. 오른손이 바빠지는 만큼 차를 더 잘 조절할 수 있는지 확인합니다.'
  }
};
let variant = gtComparison ? 'gt' : designComparison ? 'sport' : 'classic';
let controller = null;
let playing = false;

function describe() {
  const text = variants[variant];
  document.querySelector('#variant-title').textContent = text.title;
  document.querySelector('#description').textContent = text.description;
  for (const button of document.querySelectorAll('[data-variant]')) {
    button.setAttribute('aria-pressed', String(button.dataset.variant === variant));
  }
  document.querySelector('#question').textContent = text.question;
}
function showMode() {
  const mode = controller?.snapshot().mode;
  playButton.textContent = mode === 'paused' ? '계속 달리기' : playing ? '주행 멈추기' : '직접 달리기';
  if (mode === 'menu' || mode === 'result') {
    status.textContent = '차고 · 같은 장면으로 돌아가거나 직접 달리기를 눌러 비교를 이어가세요.';
    return;
  }
  if (mode === 'paused') {
    status.textContent = '일시정지 · 계속 달리기를 누르면 이어집니다.';
    return;
  }
  status.textContent = playing ? '직접 주행 중 · 안을 바꾸면 같은 위치에서 비교합니다.' : '같은 장면 · 페달을 눌러 반응을 보거나, 직접 달리기로 주행하세요.';
}
for (const button of document.querySelectorAll('[data-variant]')) {
  button.addEventListener('click', () => {
    variant = button.dataset.variant;
    controller?.setPlaying(false);
    controller?.setVariant(variant, gtComparison);
    if (controller && ['menu', 'result'].includes(controller.snapshot().mode)) controller.setScene(viewSelect.value);
    playing = false;
    describe();
    if (controller) showMode();
  });
}
sceneButton.addEventListener('click', () => {
  controller.setScene(viewSelect.value);
  playing = false;
  showMode();
});
viewSelect.addEventListener('change', () => {
  controller?.setPlaying(false);
  controller?.setView(viewSelect.value);
  playing = false;
  if (controller) showMode();
});
playButton.addEventListener('click', () => {
  playing = !playing;
  if (playing && ['menu', 'result'].includes(controller.snapshot().mode)) controller.setScene(viewSelect.value);
  controller.setPlaying(playing);
  if (playing) frame.contentWindow.focus();
  showMode();
});
document.querySelector('#size').addEventListener('change', event => {
  document.body.dataset.size = event.target.value;
});
document.querySelector('#expand').addEventListener('click', event => {
  const expanded = document.body.classList.toggle('expanded');
  event.target.textContent = expanded ? '비교 화면으로' : '크게 보기';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.body.classList.remove('expanded');
    document.querySelector('#expand').textContent = '크게 보기';
  }
});
if (matchMedia('(max-width:600px) and (orientation:portrait)').matches) {
  document.body.dataset.size = 'portrait';
  document.querySelector('#size').value = 'portrait';
}
describe();
frame.src = '../../?course=braking&study=controls-hud&qa=1&view=cockpit&v=button-pedals-1';
let deadline = performance.now() + 60000;
frame.addEventListener('load', () => { deadline = performance.now() + 60000; });
let lastState = '';
const loading = setInterval(() => {
  try {
    const next = frame.contentWindow.__controlsHudStudy;
    if (next && next !== controller) {
      controller = next;
      controller.setVariant(variant, gtComparison);
      controller.setScene(viewSelect.value);
      sceneButton.disabled = playButton.disabled = false;
      showMode();
    } else if (next) {
      const state = next.snapshot();
      const key = [state.mode, state.frozen, state.view, state.carName, state.courseName].join('|');
      if (key !== lastState) {
        lastState = key;
        playing = !state.frozen && ['race', 'countdown'].includes(state.mode);
        viewSelect.value = state.view;
        document.querySelector('#scene-name').textContent = state.courseName + ' · ' + state.carName;
        showMode();
      }
    } else if (performance.now() > deadline || frame.contentDocument?.querySelector('#fatal:not([hidden])')) {
      clearInterval(loading);
      status.textContent = '게임을 준비하지 못했습니다. 페이지를 새로 열어 주세요.';
    }
  } catch {
    clearInterval(loading);
    status.textContent = '게임 화면에 연결하지 못했습니다. 같은 주소에서 다시 열어 주세요.';
  }
}, 150);
