import { republishedCardCreditHtml } from '../../lib/articleCardCredits'

export default function RepublishedCardCredit({ article }) {
  const html = republishedCardCreditHtml(article)
  return html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null
}
