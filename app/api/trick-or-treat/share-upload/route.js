import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Public endpoint — uploads a generated share card PNG to Cloudinary and returns the public URL.
// No auth needed: the image is a user-generated haul card with no sensitive data.
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'parlor/share-cards', resource_type: 'image', unique_filename: true },
        (err, res) => err ? reject(err) : resolve(res)
      ).end(buffer)
    })

    return Response.json({ url: result.secure_url })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
