import "../../styles/common.css";

function Loading({ text = "Loading...", fullPage = false }) {
  return (
    <div className={fullPage ? "cm-loading-full" : "cm-loading"}>
      <div className="cm-spinner"></div>
      <p>{text}</p>
    </div>
  );
}

export default Loading;