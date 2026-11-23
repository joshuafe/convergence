# Convergence

A playable cooperative social word game for **2–4 people around the table**.

Play: https://joshuafe.github.io/convergence/

## Translation Lab — solo experiment

**Play the new solo mockup:** https://joshuafe.github.io/convergence/lab/

You and a rule-based computer partner, Nori, receive different before-and-after observations of a small unknown language. Build messages from two object tokens and a symbol, run experiments on a shared scene, and meet the construction conditions. Name symbols with your own word clues and select explicit hypotheses to compare with Nori. Sharing either original observation is always allowed.

Three introductory missions cover actions, reversed object order, and a moving container. Remix changes symbol sets, assignments, and object order within those same three mission families; it is limited variation, not an endless mission generator. There is no timer or guess penalty. Scene reset and undo retain observed evidence. Any construction satisfying all visible conditions is accepted.

Nori enumerates possible rulebooks from its own note and shared experiments. It never receives the hidden key or your private note unless you explicitly share the note. It can offer an association, suggest an experiment with differing predicted outcomes, and plan from a uniquely inferred rulebook. It does not interpret unrestricted natural language: your word clues are labels, and the selected meaning supplies a testable hypothesis. The game makes no external AI calls and needs no API key.

Progress is browser-local. This solo mockup does not synchronize between devices and is separate from the real multiplayer room service below. The hidden rules are present in the browser source, appropriate for an experimental single-player mockup rather than a secure puzzle service.

The new engine and UI are in `web/lab/` and build to `docs/lab/`; the existing hosted Worker serves the same `/lab/` route. Run `npm run dev` and visit `/lab/`. `node scripts/export-lab.mjs /absolute/output.html` creates a self-contained version that can be opened without a server. Automated tests validate incomplete individual knowledge, unique combined evidence, 135 remixed missions, valid plans, physical feedback, alternative solutions, and the computer partner's information boundary. Browser checks cover all three completions, clue sharing, planned sequences, reset, and refresh persistence; a 375px layout is also checked.

The screens are served by GitHub Pages. Rooms, moves, voting, and private evidence use a separate Cloudflare Worker and D1 database hosted through Sites. This is actual networked multiplayer; local storage is only used to resume the current tab's seat.

## Try it with your family

1. Open the game on your computer. Choose a nickname and **Open a new room**.
2. Use **Copy invitation link** and send that link to the other devices. Alternatively, open the game on each device and enter the six-character room code. Use a different nickname per player.
3. Wait until everyone appears in the lobby, then the host selects **Deal our perspectives**. The computer's host is also a player. **Hide** conceals its private evidence if someone is looking over a shoulder.
4. Each person reads three private evidence words. Invent a word or short phrase summarizing the idea, tap **1–3 board words** it might connect to, and **Post clue**. All clues appear when everyone has posted.
5. Discuss the shared clues and their attached tiles. You can **Edit my clue & attached words**, **Share my original evidence**, or **Open an extra perspective**. Reading evidence aloud is always legal.
6. Tap a likely answer and **Propose** it. Every player must select **I agree** before the server checks it. **Keep discussing** cancels the proposal. Wrong guesses are crossed out and discussion continues with unlimited attempts.
7. A completed round explains all four meanings. The host deals the next round. There are six rounds, taking roughly 15–30 minutes depending on conversation.

## What to look for in a playtest

Try two or three rounds before giving advice. Watch whether each person offers an interpretation, asks about another clue, changes their mind, or creates an “aha!” moment. Afterward ask: “Which connection was surprising?”, “Did your clue matter?”, and “Would you like another round?” The experiment is whether player-written clues and attached words generate useful discussion; they do not change the authored answer.

## Sharing and recovery

- No accounts or app installation. A room code admits anyone who knows it while the room is in its lobby. Keep it within your group and use nicknames.
- Join before dealing. For a new player, the host returns everyone to the lobby, adds/removes seats, and deals again. Returning to the lobby restarts the current round, while completed rounds remain recorded.
- Refreshing the same tab resumes its seat. Leaving the browser tab closed can lose its session; there is no account-based recovery. Do not use two players in a duplicated tab. Use separate devices, or separate browser windows/profiles for testing.
- A brief disconnect pauses moves. Uncertain writes are retried with the same request ID to avoid duplicate moves. The tab catches up when it becomes visible again.
- Rooms expire 24 hours after creation, not after the last move. Expired rooms cannot be read or joined and are removed in bounded cleanup during new room creation.
- There is no automatic host migration when a host disconnects. The host can reconnect in the original tab. In the lobby a host can leave and pass hosting to the next seated player. A disconnected player still counts in unanimous votes, so the host can return to the lobby and remove that seat.

## Prototype limits

- State synchronizes through authenticated HTTPS polling every **900 ms** while a tab is visible, plus network latency. This is near-real-time shared database state, not WebSockets, peer-to-peer, or simulated local multiplayer.
- Six fixed English-language puzzles. Definitions and decoys were manually reviewed for ordinary usage; semantic ambiguity is a design judgment, not a mathematical guarantee that nobody will guess from one perspective. The last round is the PITCH example from the original discussion.
- Each player starts with **one** different perspective. Two- and three-player groups can open the unused perspectives as shared hints. Giving two perspectives to each of two players made an individual solution too easy, so this prototype deliberately starts with one each.
- Clues and 1–3 tile attachments are player-created and affect the group's evidence and proposals. The target word is predetermined. There is no scoring penalty, timer, asynchronous mode, solo mode, chat lobby, avatar system, or generated puzzle feed.
- Small-group testing only: no production abuse controls, room discovery, accounts, recovery emails, or moderation. Someone with repository/source access could inspect the fixed puzzle bank. Private evidence and answers are omitted from other players' API responses during normal play.
- Hosting depends on both GitHub Pages and the separate backend remaining available. The GitHub Pages site alone cannot run multiplayer rooms.

## Develop and verify

Requires Node.js 23+ for the local SQLite preview. No package install is needed.

```sh
npm test
npm run dev
# http://127.0.0.1:4173
npm run build
node scripts/validate-artifact.mjs
```

Local preview uses a real shared SQLite database in memory, reset when the server stops. Production uses D1 with a schema migration. API writes use optimistic compare-and-swap revisions with bounded retries. Player credentials are random per-seat bearer tokens held in sessionStorage and never sent in invitation links. The server only returns a player's own private perspective, voluntarily revealed evidence, and the answer after completion/reveal. Requests carry round epochs to reject stale actions and UUIDs for idempotent retries.

`web/` contains the authored frontend; `docs/` is the built GitHub Pages output. `worker/` contains server logic and puzzles. `scripts/build.mjs` bundles all required assets and modules into a self-contained Worker at `dist/server/index.js`. `.openai/hosting.json` declares the Site and D1 binding. `drizzle/` contains the schema-only migration. Never place secrets in the frontend, source, or hosting manifest.

Pages publishes the `docs/` directory from the `main` branch. Rebuild before committing frontend changes. Backend publication separately uses the Sites source/version/deployment workflow.

The test suite covers all six rounds at 2, 3, and 4 players; concurrent database joins, clues, and votes; idempotent retries; private views; wrong guesses; reveals; hints; host permissions; stale moves; and room expiry. Browser verification exercises joining, original clues, attached tiles, voting, next-round progression, refresh recovery, and a phone-sized layout.

<details><summary>Puzzle author review — spoilers</summary>

| Answer | Four ordinary uses | Why the starting pair works |
|---|---|---|
| BANK | River edge; savings institution; tilt an aircraft; store in reserve | A watery place and a money store converge on BANK. BED/STREAM and SAFE/CHEST remain plausible individually. |
| MATCH | Fire-lighting stick; contest; paired item; suit or agree | Spark/wood/flame and rival/contest/score meet at MATCH. FIRE/LIGHT and GAME/ROUND are separate false starts. |
| SPRING | Season; coil; water source; leap | Blossom/thaw/season and coil/bounce/mattress meet at SPRING. APRIL/BLOOM and COIL/BED fit only one side. |
| SCALE | Weighing device; fish covering; musical notes; size ratio | Grams/balance and fish/skin meet at SCALE. MASS/STONE and FIN/ARMOR are individually plausible. |
| RING | Finger jewelry; bell sound; circular band; boxing arena | Finger/gold and phone/bell meet at RING. BAND/CHAIN and CALL/CHIME fit separate perspectives. |
| PITCH | Baseball throw; musical frequency; erect a tent; persuasive presentation | A throw from the mound and high/low sound favor PITCH. SCORE is intentionally tempting across the sports and music worlds; extra camping/sales perspectives resolve doubt. |

All rounds have twelve unique board words and four evidence triples. Each individual perspective has at least two authored alternative board candidates; the alternatives are discussion possibilities, not claims that every evidence word literally defines each decoy. No evidence triple prints the answer.

</details>
