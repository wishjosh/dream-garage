# 드림 개러지: 스피드 그랑프리

꿈꾸던 차를 만들고, 도시를 달려라! Tavaculo 슈퍼카와 클래식 F2002를 타고 야간 수변 도시를 달리는 스마트폰 브라우저 게임입니다.

[게임 플레이](https://wishjosh.github.io/dream-garage/) · [검사와 게시](https://github.com/wishjosh/dream-garage/actions)

## 현재 게임

차고에서 차량을 고르고 경주를 완주하면 순위에 따라 상금을 받습니다. 상금으로 도색·휠·엔진·타이어·브레이크를 구매하고 다음 경주에 도전합니다. 가속·브레이크·후진은 각각 별도 버튼이며 드리프트는 선택해서 사용합니다. 차 뒤 시점과 운전석 시점을 지원합니다.

Tavaculo는 낮은 왼쪽 운전석, Gallardo의 공개 실내 렌더를 참고해 새로 만든 대시보드·A필러·핸들, 실제 뒤쪽 도시와 차량을 비추는 룸미러를 사용합니다. F2002는 중앙 운전석입니다. 실차 치수·엔진·변속기의 정밀 재현이 아닌 게임용 구성입니다.

스마트폰은 가로 화면을 권장합니다. 왼손으로 좌우 방향을, 오른손으로 가속·제동·후진·드리프트를 조작합니다. 컴퓨터는 방향키/WASD, Space(제동), X(후진), Shift(드리프트), C(시점), P/Esc(일시정지), R(도로 복귀)를 사용합니다.

진행은 같은 기기의 같은 브라우저에 저장됩니다. 주소가 다른 게임 사이에는 **저장 기록 옮기기**에서 파일로 이전합니다. 자동 동기화 기능은 아닙니다.

## 기존 기록 이전

1. 기록이 있는 스마트폰·브라우저에서 [기존 Sites 게임](https://hojin-city-gp.wishbridge7.chatgpt.site/?v=save-transfer-1)을 열고 **저장 기록 옮기기 → 현재 기록 파일 내려받기**로 JSON 파일을 보관합니다.
2. [GitHub 게임](https://wishjosh.github.io/dream-garage/?v=save-transfer-1)의 **저장 기록 옮기기**에서 그 파일을 선택합니다.
3. 현재 기록과 파일의 상금·보유품·두 차량의 장착 상태·최고 기록·완주 횟수·설정을 비교한 뒤 **이 기록으로 바꾸기**를 누릅니다.

불러오기는 두 기록을 합산하지 않고 파일의 기록으로 교체합니다. 선택·미리보기·취소만으로 기록을 바꾸지 않습니다. 적용 전에 현재 기록을 자동 백업하며, **가져오기 전 기록 확인 → 이전 기록으로 되돌리기**에서 확인 후 복원할 수 있습니다. 중요한 기록은 파일로도 따로 보관하세요. 백업이나 저장을 확인하지 못하면 성공 처리하지 않습니다.

파일 처리는 해당 브라우저 안에서 진행하며 개인 저장 파일을 GitHub나 서버로 업로드하지 않습니다. 기존 주소의 기록은 내보내기로 삭제되지 않습니다. 이전 후에는 새 GitHub 주소를 사용하면 진행이 갈라지는 것을 줄일 수 있습니다. 앱 식별자·형식·값·크기를 확인해 다른 게임이나 손상된 파일을 거절합니다. 브라우저의 사이트 데이터를 지우면 그 주소의 저장과 자동 백업이 함께 사라질 수 있습니다.

## 개발과 게시

이 저장소를 앞으로의 GitHub 개발 기준으로 사용합니다. 최초 게임 파일은 기존 Sites 버전 11의 소스 커밋 `99ec629e11176e6e0a6fa4b974e7f19ae4ae6ebd`와 같습니다. 이전 변경 이력과 내부 제작 기록은 기존 로컬 저장소에 보존하고 공개 저장소는 이 검증본부터 시작합니다.

Node.js 22 이상에서 별도 패키지 설치 없이 실행합니다.

```sh
npm run dev
npm run check
npm test
```

개발 주소는 `http://127.0.0.1:4177/`이며 운전석 검토 화면은 `/__qa__/cockpit-review.html`, 저장 이전 검토 화면은 `/__qa__/save-review.html`입니다. `dist/`에 게임 소스와 실행 자료, `tests/`에 76개 검사, `scripts/`에 개발 서버와 로컬 검토 도구가 있습니다.

`main`에 코드를 올리거나 pull request를 만들면 GitHub Actions가 JavaScript와 자동 검사를 실행합니다. 공개 게임 갱신은 **Check and publish game → Run workflow → main**을 수동 실행합니다. 검사가 통과한 뒤 `dist/`만 GitHub Pages에 게시합니다. 코드 업로드만으로 플레이 화면이 바뀌지 않습니다. 기존 Sites 주소와 자동 동기화하지 않습니다.

기본 검사는 물리 주행·전후진·드리프트·상금·구매·저장·바퀴·후방 카메라를 확인합니다. 로컬 운전석 검토는 합성 입력과 화면 크기 재현을 사용하며 실제 휴대폰의 멀티터치 하드웨어·성능·조작감을 대신하지 않습니다.

## 사용한 자료

- [Tavaculo](https://blendswap.com/blend/22872): 제작자 선언 CC0. GLB 변환·크기 정규화·바퀴 분리와 축 보정.
- [Classic F2002 · som_natalino](https://som-natalino.itch.io/iconic-open-wheelers-low-poly-car-pack): 무료 제공 차량, CC0. 바퀴 분리.
- [Kenney City Kit Commercial](https://kenney.nl/assets/city-kit-commercial), [Nature Kit](https://kenney.nl/assets/nature-kit): CC0. 건물·야자수와 기본 색상 사용.
- [ambientCG Asphalt012](https://ambientcg.com/view?id=Asphalt012): CC0. [재질 출처](dist/assets/materials/LICENSE.txt).
- Three.js: MIT. [라이선스](dist/vendor/THREE-LICENSE.txt).
- cannon-es: MIT. [라이선스](dist/vendor/CANNON-LICENSE.txt).
- [Neubi의 Gallardo 실내 렌더](https://blendswap.com/blend/8686): 운전석 형상 참고. 원본 메시·텍스처는 포함하지 않습니다.

자료별 이용 조건은 해당 자료에 적용합니다. 게임 원래 코드 전체의 공개 라이선스는 아직 선택하지 않았습니다.
