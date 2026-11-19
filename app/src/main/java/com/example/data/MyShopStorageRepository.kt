package com.example.data

import android.content.Context
import android.net.Uri
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.auth
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.storage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

class MyShopStorageRepository(
    private val storage: FirebaseStorage = Firebase.storage,
    private val auth: FirebaseAuth = Firebase.auth
) {
    private fun requireUid(): String =
        auth.currentUser?.uid ?: throw IllegalStateException("User must sign in with Google before uploading to Storage.")

    suspend fun uploadProfileAvatar(context: Context, imageUri: Uri): Result<String> {
        return try {
            val uid = requireUid()
            val bytes = withContext(Dispatchers.IO) {
                context.applicationContext.contentResolver.openInputStream(imageUri)?.use { it.readBytes() }
                    ?: throw IllegalStateException("Could not read selected image.")
            }
            require(bytes.size <= 5 * 1024 * 1024) { "Image must be smaller than 5 MB." }

            val ref = storage.reference.child("users/$uid/avatar.jpg")
            ref.putBytes(bytes).await()
            val downloadUrl = ref.downloadUrl.await().toString()
            Result.success(downloadUrl)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
