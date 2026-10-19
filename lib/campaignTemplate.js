
const LOGO_MARK = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png'

const LOGO_TEXT = 'https://res.cloudinary.com/dwytmbczs/image/upload/v1779376345/Heading_2560_x_1000_px_2600_x_1000_px_2650_x_1000_px_3_1_lxgvp5.png'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function campaignEmailHtml(subject, body, footerHtml = '') {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
<style>
a:not([style*="background"]) {
  color: #7A263A !important;
}
a:not([style*="background"]):visited {
  color: #7A263A !important;
}
</style>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f4f0">
<tr>
<td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">
<tr>
<td align="center" style="background:#fff;padding:28px 40px 20px;border-radius:10px 10px 0 0;border-bottom:1px solid #f0ece6">
<img src="${LOGO_MARK}" alt="" width="90" height="90" style="border-radius:50%;display:block;margin:0 auto 12px">
<img src="${LOGO_TEXT}" alt="The Parlor" height="52" style="display:block;margin:0 auto;max-width:320px;width:100%;height:auto">
</td>
</tr>
<tr>
<td style="background:#fff;padding:36px 48px 40px">
${body}
${footerHtml}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
}
