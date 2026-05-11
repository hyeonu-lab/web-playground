# 자리바꾸기표 관리 메모

이 도구는 `tools/seat-chart/` 안에서 독립적으로 동작한다.

## 파일 구조

- `index.html`: 교실 화면과 설정 패널의 DOM 구조
- `style.css`: 칠판, 교탁, 책상 카드, 셔플/공개 애니메이션 스타일
- `script.js`: 상태 저장, 좌석 렌더링, 책상 직접 입력, 자리 섞기 로직

## 주요 상태

- `title`: 칠판과 설정 패널의 반 제목
- `names`: 숨겨진 textarea에 보관하는 학생 이름 목록
- `groupCount`, `cols`, `rows`: 분단 수와 분단별 좌석 구조
- `shuffledNames`: 실제 책상 위치를 보존하는 좌석 배열이다. 빈 책상은 빈 문자열로 유지한다.
- `revealMode`: 셔플 완료 후 이름을 숨긴 카드 상태인지 여부
- `revealedSeats`: 공개된 좌석 index 목록

## 셔플 흐름

속도는 `script.js`의 `SHUFFLE_DURATION` 하나로 조절한다. 이 값은 JS 대기 시간과 CSS 변수 `--shuffle-duration`에 같이 적용된다.

1. `handleShuffle()`이 현재 좌석 배열을 만든다.
2. 모든 카드를 `hidden` 상태로 렌더링한다.
3. `runShuffleAnimation()`이 `SHUFFLE_ROUNDS`만큼 반복한다.
4. 각 라운드에서 `applyShuffleAnimationRound()`가 카드별 CSS 변수 `--shuffle-x`, `--shuffle-y`, `--shuffle-x2`, `--shuffle-y2`, `--shuffle-rotate`를 설정한다.
5. CSS `cardShuffleMove` keyframes가 실제 `translate()` 이동을 수행한다.
6. 마지막에 `shuffledSeatOrder()`로 이름이 있는 자리만 섞고 최종 배열을 저장한다.
7. 셔플 후에는 `revealMode`가 유지되어 카드 클릭 시 하나씩 공개된다.

## CSS 클래스

- `desk-card`: 모든 책상 카드
- `empty`: 빈자리
- `hidden`: 셔플 후 이름이 숨겨진 카드
- `revealed`: 클릭으로 공개된 카드
- `revealing`: 공개 flip 애니메이션 중인 카드
- `shuffling`: 셔플 이동 애니메이션 중인 카드

## 저장

`localStorage` 키는 `web-playground-seat-chart`이다. 저장 구조가 바뀔 때는 `STORAGE_VERSION`을 올리면 이전 저장값이 새 기본값으로 초기화된다.
