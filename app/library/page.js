import { redirect } from 'next/navigation'

// The Library now lives inside the member portal.
export default function LibraryRedirect() {
  redirect('/portal/library')
}
