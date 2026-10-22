export async function POST() {
  return Response.json(
    { error: 'Automatic gift claims are disabled. Donations must be verified in MonkeyPod.' },
    { status: 410 }
  )
}
