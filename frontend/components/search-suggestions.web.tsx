export function SearchSuggestions({ url }: { url: string }) {
  return <iframe title="Google Search sources and suggestions" src={url} sandbox="allow-popups allow-popups-to-escape-sandbox"
    style={{ width: "100%", height: 260, border: 0, borderRadius: 14, background: "#F5FBFE", marginTop: 12 }}/>;
}
