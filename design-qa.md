# Design QA

**Scope**

This pass covers the complete local product flow built from the selected pixel-animal visual direction: onboarding, classroom home, prep room, teaching room, result feedback, leaderboard, restore, privacy, settings, and local data deletion.

**Visual Truth and Evidence**

- Main source: `/Users/xllin/小异空间/工作/项目/TT/docs/ui-concepts/live-classroom-pixel-animals.png`
- Prep source: `/Users/xllin/小异空间/工作/项目/TT/docs/ui-concepts/prep-room-pixel-animals.png`
- Result source: `/Users/xllin/小异空间/工作/项目/TT/docs/ui-concepts/class-results-leaderboard-pixel-animals.png`
- Desktop classroom: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-complete-desktop-classroom.png`
- Desktop prep: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-prep-redesign-desktop.png`
- Desktop result: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-result-redesign-desktop.png`
- Mobile result: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-result-redesign-mobile.png`
- Desktop leaderboard: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-complete-desktop-leaderboard.png`
- Mobile classroom: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-complete-mobile.png`
- Mobile prep: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-prep-redesign-mobile.png`
- Desktop layered classroom: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-classroom-sprites-desktop.png`
- Mobile layered classroom question: `/Users/xllin/小异空间/工作/项目/TT/ui-prototype/qa-classroom-sprites-mobile.png`
- Preview URL: `http://localhost:4173/`

**Viewport and State**

- Desktop evidence: CSS viewport `1280 x 720`, browser output `1280 x 720`, DPR normalized by the browser screenshot surface.
- Mobile evidence: CSS viewport `390 x 844`, browser output captured from the same local implementation.
- Tablet verification: CSS viewport `1024 x 768`.
- Desktop state: restored demo class, classroom home / prep / result / leaderboard routes.
- Mobile state: restored demo class, classroom home and completed prep routes.
- The source concept images are visual direction references, so the final implementation uses their composition and palette while making the cards, routes, copy, and controls interactive.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Typography: the interface uses a readable Chinese system stack with pixel-like monospace treatment for brand and numbers. This keeps long Chinese copy legible while preserving the game feel. A licensed Chinese bitmap font remains a P3 polish option.
- Spacing and layout: desktop keeps the classroom dominant, prep uses one focused work area plus a live lesson outline, result uses evidence-first hierarchy, and the leaderboard uses a full-width readable list. Mobile turns prep into a single-column flow with a horizontally scrollable stepper and no page-level horizontal overflow.
- Colors and tokens: dark green means classroom/understanding, red means action, yellow means growth/selection, blue means expression, and green means progress. No purple gradient, glassmorphism, or single beige theme is used.
- Image quality and asset fidelity: the classroom now uses one empty environment image plus six transparent character sprites. The prep and result pages no longer embed generated full-screen UI images; experiment controls, lesson outlines, scoreboards, student growth values, buttons, and ranking content are native components.
- Copy and content: the product consistently says “匿名虚拟班级”“教学反馈” and avoids real-child ranking or diagnostic language.
- Icons: common controls use Phosphor icons with accessible names and tooltips on icon-only actions.
- Responsiveness: classroom, prep, result, leaderboard, privacy, and restore routes all reported `scrollWidth === clientWidth` at `390 x 844`; no tested text control overflowed.
- Accessibility: controls use semantic buttons, labels, alt text, focus-visible outlines, and reduced-motion support.

**Primary Interactions Tested**

- Create class flow: avatar step, class name, province selection, and class creation.
- Restore flow: clear local class, enter `TNY-6A9P`, restore class, return to classroom.
- Prep flow: answer the AI prep partner's concept question, receive a targeted retry for an incomplete answer, explain the iron-block/iron-ship example, prepare for Xiaobai's follow-up, generate a three-part lesson outline, refresh to restore it, and enter class.
- Prep-to-teach continuity: the child's concept appears in the teaching mission note and the selected predicted question becomes the first classroom question.
- Teaching flow: complete the opening explanation, receive a student question, answer it, read the student's understanding feedback, continue through three dialogue rounds, retain all ten utterances in the lesson log, and only then complete the lesson.
- Student voice flow: each question and understanding response plays from bundled Mandarin audio, supports replay and stop in the classroom bubble, and falls back to the browser's Chinese voice when available.
- Character flow: verify six independent sprites, listening state during recording, one raised-hand state during questions, completed-answer sparkle feedback, and previous students retaining their understood state during the next question.
- Result flow: open evidence rows, expand review note, go to leaderboard, prepare next lesson.
- Leaderboard flow: switch province/national tabs, change province filter, see current-class row and disclaimer.
- Settings flow: open modal, toggle reduced motion, open privacy page.
- Privacy flow: view data boundary, copy class code affordance, open and confirm clear-data dialog.
- Fresh-browser console check: no errors after opening `/classroom` in a new tab.

**Comparison History**

1. Initial visual prototype had only the live classroom surface. The missing planned routes were implemented as functional local pages.
2. Settings test exposed a runtime error from an omitted `SpeakerHigh` import. The import was added, the app rebuilt, and the settings/privacy path passed.
3. Restore test exposed an incorrect formatter that turned `TNY-6A9P` into a broken grouping. The formatter was changed to preserve the `TNY-XXXX` shape, and clear → restore passed.
4. Final visual pass captured all main desktop routes and the mobile classroom. No actionable P0/P1/P2 mismatch remains.
5. The prep-room audit found that nine selection cards and an embedded full-screen mock image did not create a real learning action. The page was rebuilt as a five-step interactive workbench; a classroom indexing bug that skipped the prepared first question was found during flow testing and fixed.
6. A whole-page asset audit found that `results-room.png` also contained baked-in buttons, tabs, scores, and ranking rows. It was replaced with a native result board and six live student growth items while preserving the pixel-animal visual direction.
7. The classroom audit found that the original `classroom.png` baked all six students into the environment. It was replaced with `classroom-empty.png` and six transparent sprites; mobile question changes now scroll the stage below the sticky navigation so the new prompt remains visible.
8. The teaching-flow audit found that the old four-step button advanced without requiring a real response, while the separate student-status panel reduced the classroom and duplicated feedback. The panel was removed, animals were reduced in scale, and the lesson was rebuilt as a gated three-round explanation/question/answer/feedback loop.
9. The second prep-room audit found that the five-step workbench still felt like an adult lesson-planning form. It was replaced with one AI conversation and a live three-part lesson outline; experiments and examples now appear as contextual prompts instead of mandatory visible steps.
10. The classroom follow-up added a right-side dialogue log for the child's explanation, student questions, child answers, and student feedback. It replaces the removed status panel without duplicating student metrics and becomes a full-width section below the classroom on narrow screens.

**Verification**

- `npm run build`: passed.
- `npm run test:sites`: 4/4 passed.
- Source check: no `prep-room.png`, `results-room.png`, `.prep-scene`, `.prep-card`, or `.prep-columns` references remain in `src/`.
- Fresh-browser console check: no errors on the redesigned prep route.
- Local preview remains running at `http://localhost:4173/`.

**Follow-up Polish**

- P3: add a licensed Chinese pixel font bundle.
- P3: connect dynamic server-side TTS and the backend AI/ASR service described in `PROJECT_PLAN.md`; the current scripted classroom dialogue already uses bundled Mandarin TTS audio.
- P3: add server-side persistence and signed leaderboard submissions before public release.

final result: passed
