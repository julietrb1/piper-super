import { useEffect, useState } from "react";

export function useWeightPresets() {
  // const [weightPresets, setWeightPresets] = useState<
  //   Schema["WeightPreset"]["type"][]
  // >([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = client.models.WeightPreset.observeQuery().subscribe({
      next: ({ items }) => {
        setIsSubscribed(true);
        setIsLoading(false);
        setWeightPresets(
          [...items].toSorted((a, b) =>
            a.presetName.localeCompare(b.presetName)
          )
        );
      },
      error: (err) => {
        console.error(err);
        setError(`Error fetching weight presets`);
        setIsLoading(false);
      },
    });

    return () => {
      setIsSubscribed(false);
      sub.unsubscribe();
    };
  }, []);

  return { weightPresets, isLoading, error, isSubscribed };
}
