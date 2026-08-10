import { Link } from 'react-router-dom';

/**
 * A wrong turn is not a crash and should not read like one. No error code as a
 * headline, no console noise — just where you are and one way back.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center p-6">
      <h1>Nothing here</h1>
      <p className="-mt-2 text-muted-foreground">
        That address does not point at anything. Your notes are fine.
      </p>
      <p className="mt-6">
        <Link to="/" className="rounded font-bold text-primary underline underline-offset-2">
          Back to your notes
        </Link>
      </p>
    </div>
  );
}
