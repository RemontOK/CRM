export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text.trim()) {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Mobile Safari often blocks async clipboard — try fallback below.
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (copied) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
};

export const shareTextOrLink = async (text: string, title = 'Ссылка'): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }
  try {
    await navigator.share({ title, text, url: text.startsWith('http') ? text : undefined });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return true;
    }
    return false;
  }
};
