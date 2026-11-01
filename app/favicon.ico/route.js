// Support browsers and standalone pages that request the conventional favicon URL.
export function GET() {
  return Response.redirect('https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png', 302)
}
