type Props = { title: string; note: string };

export function RoutePlaceholder({ title, note }: Props) {
  return (
    <main className="placeholder">
      <p className="eyebrow">THE MOVIE WEB · SET-01</p>
      <h1>{title}</h1>
      <p>{note}</p>
    </main>
  );
}
