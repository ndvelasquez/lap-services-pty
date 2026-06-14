// Infraestructura compartida: subida de imágenes a Supabase Storage.
import { supabase } from '../lib/supabase'

export async function uploadImages(files) {
  const urls = []

  if (!files || files.length === 0) return { urls }

  for (const file of files) {
    // Nombre único: timestamp + string aleatorio + extensión original
    const fileExt = file.name ? file.name.split('.').pop() : 'jpg'
    const randomStr = Math.random().toString(36).substring(7)
    const fileName = `${Date.now()}-${randomStr}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('lap_images')
      .upload(filePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      console.error('Upload Error:', uploadError.message)
      throw new Error(`Error subiendo la imagen ${file.name}: ${uploadError.message}`)
    }

    // URL pública (el bucket lap_images es público para fotos del wizard)
    const { data: publicData } = supabase.storage
      .from('lap_images')
      .getPublicUrl(filePath)

    if (publicData?.publicUrl) {
      urls.push(publicData.publicUrl)
    }
  }

  return { urls }
}
