type BrandLoaderProps = {
  cover?: "page" | "area";
};

export function BrandLoader({ cover = "page" }: BrandLoaderProps) {
  return (
    <div
      className={
        cover === "area"
          ? "session-splash session-splash--area"
          : "session-splash"
      }
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <p className="session-splash__mark" aria-hidden="true">
        SouperSurveyForm
      </p>
    </div>
  );
}
