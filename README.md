# 드림 개러지: 스피드 그랑프리

꿈꾸던 차를 만들고, 도시를 달려라! Tavaculo 슈퍼카와 클래식 F2002를 타고 야간 수변 도시를 달리는 스마트폰 브라우저 게임입니다.

[게임 플레이](https://wishjosh.github.io/dream-garage/) · [검사와 게시](https://github.com/wishjosh/dream-garage/actions)

## 현재 게임

차고에서 차량을 고르고 경주를 완주하면 순위에 따라 상금을 받습니다. 상금으로 도색·휠·엔진·타이어·브레이크를 구매하고 다음 경주에 도전합니다. 가속·브레이크·후진은 각각 별도 버튼이며 드리프트는 선택해서 사용합니다. 차 뒤 시점과 운전석 시점을 지원합니다.

Tavaculo는 낮은 왼쪽 운전석, Gallardo의 공개 실내 렌더를 참고해 새로 만든 대시보드·A필러·핸들, 실제 뒤쪽 도시와 차량을 비추는 룸미러를 사용합니다. F2002는 중앙 운전석입니다. 실차 치수·엔진·변속기의 정밀 재현이 아닌 게임용 구성입니다.

스마트폰은 가로 화면을 권장합니다. 왼손으로 좌우 방향을, 오른손으로 가속·제동·후진·드리프트를 조작합니다. 컴퓨터는 방향키/WASD, Space(제동), X(후진), Shift(드리프트), C(시점), P/Esc(일시정지), R(도로 복귀)를 사용합니다.

진행은 같은 기기의 같은 브라우저에 저장됩니다. 기존 [Sites 게임](https://hojin-city-gp.wishbridge7.chatgpt.site/)과 GitHub Pages는 주소가 달라 상금·꾸미기·기록이 자동으로 이전되거나 동기화되지 않습니다. 기존 게임과 저장은 그대로 유지됩니다.

## 개발과 게시

이 저장소를 앞으로의 GitHub 개발 기준으로 사용합니다. 최초 게임 파일은 기존 Sites 버전 11의 소스 커밋 `99ec629e11176e6e0a6fa4b974e7f19ae4ae6ebd`와 같습니다. 이전 변경 이력과 내부 제작 기록은 기존 로컬 저장소에 보존하고 공개 저장소는 이 검증본부터 시작합니다.

Node.js 22 이상에서 별도 패키지 설치 없이 실행합니다.

```sh
npm run dev
npm run check
npm test
```

개발 주소는 `http://127.0.0.1:4177/`이며 운전석 검토 화면은 `/__qa__/cockpit-review.html`입니다. `dist/`에 게임 소스와 실행 자료, `tests/`에 36개 검사, `scripts/`에 개발 서버와 로컬 검토 도구가 있습니다.

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
