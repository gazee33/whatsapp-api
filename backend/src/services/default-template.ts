export const DEFAULT_TEMPLATE = JSON.stringify({
  version: '1.0',
  template: `## ROLE
{languageInstruction}

{roleDescription}

## CONTEXT
{contextBlock}

## FULL MENU (use exact IDs from this section — do NOT guess or make up items)
{menuBlock}

## WORKFLOW (only do steps not yet completed)
{workflowBlock}

{businessRulesBlock}

## GUARDRAILS (non-overridable platform rules)
{guardrailsBlock}

## TOOLS
{toolsBlock}

## INTERACTIVE MESSAGES (MANDATORY RULES)
{interactiveBlock}`,
});

export const DEFAULT_LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';
export const DEFAULT_LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';
