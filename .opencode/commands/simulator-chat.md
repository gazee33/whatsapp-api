---
description: Open the simulator and chat in Arabic using Chrome DevTools
---

# Simulator Chat (Arabic)

Open `http://localhost:3000/simulator` and conduct a chat conversation in Arabic, fixing any errors encountered.

## Workflow

### 1. Open the Simulator

Use `chrome-devtools_new_page` with:
- `url`: `http://localhost:3000/simulator`
- `background`: `false`

Wait for the page to load, then take a snapshot with `chrome-devtools_take_snapshot`.

### 2. Check for Errors

- If a login page appears instead of the simulator, the user needs to log in first. STOP and tell the user to authenticate first.
- If a loading/skeleton state is visible, wait up to 10 seconds for the page to fully render, retaking snapshots until the input field appears.
- If a page error (500, 404) appears, report the error to the user and STOP.

### 3. Verify Simulator Loaded

Confirm these elements appear in the snapshot:
- `[name="Simulator"]` or heading text "Simulator"
- The text input field (check for `input[type="text"]` or `textarea`)
- The Send button

### 4. Send Arabic Messages

Send messages in sequence using this pattern — repeat for each user message:

```typescript
// 1. Type the Arabic message into the input
// Use chrome-devtools_fill with the input element's uid

// 2. Click Send
// Use chrome-devtools_click with the Send button's uid

// 3. Wait for the AI response
// Use chrome-devtools_wait_for with text that contains parts of the expected response
// The response may be in Arabic, so wait for any new message bubble to appear
// Wait up to 30 seconds for the AI to respond

// 4. Take a screenshot
// Use chrome-devtools_take_screenshot to capture the conversation
// Save as: .opencode/artifacts/simulator-chat-{step}.png

// 5. Check for errors
// Use chrome-devtools_list_console_messages to check for console errors
// If error text appears in red (check snapshot for error elements), log the error
// If there's a network error, the page might show an error message below the input
```

### 5. Arabic Test Messages

Send these messages in order (each message is sent only after receiving the previous response):

| Step | Arabic Message | English Translation |
|------|---------------|-------------------|
| 1 | `السلام عليكم، أريد طلب شاورما دجاج` | Hello, I want to order chicken shawarma |
| 2 | `كم سعر شاورما دجاج؟` | How much is chicken shawarma? |
| 3 | `أريد 2 شاورما دجاج و 1 بطاطس مقلية` | I want 2 chicken shawarma and 1 french fries |
| 4 | `شكراً لك` | Thank you |

### 6. Error Recovery

If any step produces an error or unexpected behavior:

1. **Console errors**: Note them, take a screenshot of the error state, and attempt to continue to the next step.
2. **Page crash / blank screen**: Navigate (`chrome-devtools_navigate_page` with `url: "http://localhost:3000/simulator"`) and try again from step 1.
3. **Network error / API failure**: The error message will appear below the input in red. Take a screenshot, log the error. Try sending the same message again once.
4. **Stuck loading (isLoading more than 30s)**: Take a screenshot, try clicking Reset button if visible, then continue with the next message.

### 7. Reporting

After completing the chat sequence (or if unrecoverable errors stop progress), produce a report:

```
## Simulator Chat Report (Arabic)

Status: [SUCCESS / PARTIAL / FAILED]

Messages Sent: X/Y
Errors Encountered:
- Step N: [description of error]

Screenshots saved to: .opencode/artifacts/simulator-chat-*.png

Console Errors:
- [any notable console errors]

Notes:
- [any observations about response quality in Arabic]
- [any UI issues observed]
```
