import posthog from "posthog-js";
import type { TransformErrorType } from "@json-transformer/core";

type EditorMode = "builder" | "dsl";

function isEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
}

function capture(event: string, properties?: Record<string, unknown>): void {
  if (!isEnabled()) return;
  posthog.capture(event, properties);
}

export function trackTemplateLoaded(props: {
  template_id: string;
  template_name: string;
  template_category: string;
  editor_mode: EditorMode;
}): void {
  capture("template_loaded", props);
}

export function trackJsonPasted(props: {
  paste_length: number;
  input_valid: boolean;
  editor_mode: EditorMode;
}): void {
  capture("json_pasted", props);
}

export function trackTransformCompleted(props: {
  warning_count: 0;
  output_field_count: number;
  editor_mode: EditorMode;
  input_size: number;
  dsl_size: number;
}): void {
  capture("transform_completed", props);
}

export function trackTransformWarning(props: {
  warning_count: number;
  warning_types: TransformErrorType[];
  editor_mode: EditorMode;
  input_size: number;
  dsl_size: number;
}): void {
  capture("transform_warning", props);
}

export function trackOutputCopied(props: {
  output_length: number;
  warning_count: number;
}): void {
  capture("output_copied", props);
}
