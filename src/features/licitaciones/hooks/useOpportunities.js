import { useCallback, useEffect, useState } from "react";
import { fetchOpportunities, updateOpportunityCrm } from "../services/opportunityService.js";

export function useOpportunities(enabled) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try { setOpportunities(await fetchOpportunities()); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [enabled]);

  useEffect(() => { reload(); }, [reload]);

  const updateCrm = useCallback(async (id, fields) => {
    const previous = opportunities.find((item) => item.id === id);
    setOpportunities((items) => items.map((item) => item.id === id ? { ...item, ...fields } : item));
    setFeedback(null);
    try {
      const saved = await updateOpportunityCrm(id, fields);
      setOpportunities((items) => items.map((item) => item.id === id ? saved : item));
      setFeedback({ type: "success", message: "Oportunidad actualizada" });
      return saved;
    } catch (requestError) {
      if (previous) setOpportunities((items) => items.map((item) => item.id === id ? previous : item));
      setFeedback({ type: "error", message: requestError.message });
      throw requestError;
    }
  }, [opportunities]);

  return { opportunities, loading, error, feedback, setFeedback, reload, updateCrm };
}
