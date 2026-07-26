// "fable" is a branding label for the most capable Claude model. There is no
// literal `fable` / `claude-fable-5` model in the Claude binary, so selecting it
// must resolve to a real model id at send time — otherwise the CLI rejects the
// session with "model not found". The newest Opus is the most capable model, so
// fable maps to it.
//
// This is the full model id (not the `opus-5` short alias): the alias is not in
// the CLI's alias table yet, while the full id passes straight through to the
// API — matching how the model picker lists Opus 5. Bump this when a newer Opus
// ships so fable keeps tracking "most capable".
const MOST_CAPABLE_MODEL = 'claude-opus-5';

// Picker key (or legacy stored key) -> real model id sent to the Claude SDK.
const MODEL_SEND_ALIASES: Record<string, string> = {
    fable: MOST_CAPABLE_MODEL,
    'claude-fable-5': MOST_CAPABLE_MODEL,
};

// Legacy stored model key -> current picker option key, so sessions saved before
// the picker key was renamed still highlight the right option in the UI.
const MODEL_DISPLAY_ALIASES: Record<string, string> = {
    'claude-fable-5': 'fable',
};

export function resolveModelToSend(model: string): string {
    return MODEL_SEND_ALIASES[model] ?? model;
}

export function normalizeModelDisplayKey(model: string): string {
    return MODEL_DISPLAY_ALIASES[model] ?? model;
}
