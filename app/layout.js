import PageViewTracker from './_components/PageViewTracker'
import RecoveryRedirect from './_components/RecoveryRedirect'
import CartDrawer from './_components/CartDrawer'
import ShopStateSync from './_components/ShopStateSync'
import ConfirmHost from './_components/ConfirmHost'
import PortalTour from './_components/portal-tour/PortalTour'

export const metadata = {
  title: 'The Parlor',
  description: 'Independent ideas, shared conversations, and a place to belong. Explore The Parlor Magazine.',
  metadataBase: new URL('https://www.theparlormagazine.com'),
  icons: {
    icon: [{ url: 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png', type: 'image/png', sizes: '200x200' }],
    apple: 'https://res.cloudinary.com/dwytmbczs/image/upload/v1777313271/Copy_of_The_Parlour_200_x_200_px_q3d7jv.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Image hosts — open the connection early so covers/hero load sooner. */}
        <link rel="preconnect" href="https://static.wixstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://nxpwcdtduxsorbzoajbm.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&display=swap" rel="stylesheet" />
      </head>
      <body>
        <RecoveryRedirect />
        <PageViewTracker />
        {children}
        <ShopStateSync />
        <CartDrawer />
        <ConfirmHost />
        <PortalTour />
      </body>
    </html>
  )
}
