import { Input } from "@/components/ui/input";

export function SearchForm({
  action,
  placeholder,
  defaultValue,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <form action={action} method="get" className="max-w-xs">
      <Input type="search" name="q" placeholder={placeholder} defaultValue={defaultValue} aria-label={placeholder} />
    </form>
  );
}
