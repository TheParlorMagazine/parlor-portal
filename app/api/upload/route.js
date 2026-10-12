import { v2 as cloudinary } from 'cloudinary'
import { requireUser } from '../../../lib/apiAuth'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request) {
  const user = await requireUser(request)
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  const folder = formData.get('folder') || 'parlor'

  if (!file) return Response.json({ error: 'No file' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', use_filename: true, unique_filename: true },
      (err, res) => err ? reject(err) : resolve(res)
    ).end(buffer)
  })

  return Response.json({ url: result.secure_url, public_id: result.public_id })
}
