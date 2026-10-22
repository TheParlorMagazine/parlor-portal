import { requireUser, serviceClient, memberOf } from '../../../../../lib/apiAuth'

async function authorize(request) {
  const user = await requireUser(request)

  if (!user) {
    return {
      error: Response.json(
        { error: 'Please sign in.' },
        { status: 401 }
      )
    }
  }

  const db = serviceClient()
  const member = await memberOf(db, user.id)

  if (member?.role !== 'admin') {
    return {
      error: Response.json(
        { error: 'Master Admin access required.' },
        { status: 403 }
      )
    }
  }

  return { db }
}


export async function PATCH(request) {
  const auth = await authorize(request)
  if (auth.error) return auth.error

  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!body || typeof body.id !== "string" || !body.id.trim()) {
    return Response.json({ error: "A fundraising ask ID is required." }, { status: 400 })
  }

  const title = body.title?.trim()
  const amount = Number(body.amount)

  if (!title || typeof body.title !== "string" || title.length > 200) {
    return Response.json({ error: "Please enter a valid title (maximum 200 characters)." }, { status: 400 })
  }

  if (body.amount === "" || body.amount === null || !Number.isFinite(amount) || amount < 0) {
    return Response.json({ error: "Please enter a valid price of zero or more." }, { status: 400 })
  }

  const capacity = body.capacity === null ? null : Number(body.capacity)

  if (body.capacity !== null && (body.capacity === "" || !Number.isSafeInteger(capacity) || capacity < 0)) {
    return Response.json({ error: "Units available must be a nonnegative whole number, or unlimited." }, { status: 400 })
  }

  if (typeof body.description !== "string" || body.description.length > 10000) {
    return Response.json({ error: "Description must be text under 10,000 characters." }, { status: 400 })
  }

  const url = body.monkeypod_url?.trim() || ""

  if (typeof body.monkeypod_url !== "string" || (url && !/^https:\/\/[^\s]+$/i.test(url))) {
    return Response.json({ error: "Please enter a valid HTTPS donation URL or leave it blank." }, { status: 400 })
  }

  const { data, error } = await auth.db
    .from("fundraising_asks")
    .update({
      title,
      amount,
      capacity,
      description: body.description,
      monkeypod_url: url || null
    })
    .eq("id", body.id)
    .select()
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return Response.json({ error: "Fundraising ask not found." }, { status: 404 })
  }

  return Response.json({ ask: data })
}
