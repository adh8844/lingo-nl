

# Fix: Prevent Native Keyboard from Auto-Opening on Android

## Problem
The hidden input auto-focuses on every game state change (line 278-282), which triggers the native keyboard on Android phones. The keyboard should only appear when the user explicitly taps "Open toetsenbord".

## Solution
Remove the auto-focus `useEffect` (lines 278-282) and the `onBlur` re-focus behavior on the hidden input. Keep `focusHiddenInput` only for the explicit button click and the `onClick` on the game container.

## Changes

### `src/components/LingoGame.tsx`
1. **Remove the auto-focus useEffect** (lines 278-282) that calls `focusHiddenInput` on mount and after each guess
2. **Remove the `onBlur` handler** on the hidden input that re-focuses it automatically
3. **Remove `onClick={focusHiddenInput}`** from the container div — tapping the game area should not open the native keyboard
4. Keep the `focusHiddenInput` function — it's still used by the "⌨️ Open toetsenbord" button

