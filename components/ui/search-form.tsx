import { Input } from "@/components/ui/input";

export function SearchForm({
  action,
  placeholder,
  defaultValue,
  hiddenParams,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  hiddenParams?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" className="max-w-xs">
      {hiddenParams &&
        Object.entries(hiddenParams).map(
          ([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />
        )}
      <Input type="search" name="q" placeholder={placeholder} defaultValue={defaultValue} aria-label={placeholder} />
    </form>
  );
}
