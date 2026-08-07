import {
  DOCUMENT_CLIENT_DATA_TABLE_TOKEN,
  DocumentClientDataTableVariant,
  buildClientDataTableEditorInsertHtml,
  decorateClientDataTableForEditor,
  normalizeClientDataTableFromEditor,
} from './documentClientDataTable';
import {
  DOCUMENT_WORKS_TABLE_TOKEN,
  buildWorksTableEditorInsertHtml,
  decorateDocumentTemplateForEditor as decorateWorksTableForEditor,
  normalizeDocumentTemplateFromEditor as normalizeWorksTableFromEditor,
} from './documentWorksTable';

export const normalizeDocumentTemplateFromEditor = (
  html: string,
  variant: DocumentClientDataTableVariant = 'acceptance'
) => normalizeWorksTableFromEditor(normalizeClientDataTableFromEditor(html, variant));

export const decorateDocumentTemplateForEditor = (
  html: string,
  variant: DocumentClientDataTableVariant = 'acceptance'
) => decorateClientDataTableForEditor(decorateWorksTableForEditor(html), variant);

export const buildDocumentTemplateEditorInsertHtml = (token: string, variant: DocumentClientDataTableVariant = 'acceptance') => {
  if (token === DOCUMENT_WORKS_TABLE_TOKEN) {
    return buildWorksTableEditorInsertHtml();
  }
  if (token === DOCUMENT_CLIENT_DATA_TABLE_TOKEN) {
    return buildClientDataTableEditorInsertHtml(variant);
  }
  return token;
};

export { DOCUMENT_CLIENT_DATA_TABLE_TOKEN, DOCUMENT_WORKS_TABLE_TOKEN };
