import { FieldApi } from "@tanstack/react-form";

export function FieldInfo({ field }: { field: FieldApi<any, any, any, any> }) {
  return (
    <>
      {field.state.meta.isTouched && field.state.meta.errors ? (
        <p className="text-[0.8rem] font-medium text-destructive">
          {field.state.meta.errors.join(", ")}
        </p>
      ) : null}
    </>
  );
}
