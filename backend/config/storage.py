import os
import base64
from django.core.files.storage import Storage
from django.conf import settings
from django.utils.deconstruct import deconstructible
from imagekitio import ImageKit

@deconstructible
class ImageKitStorage(Storage):
    """
    Native ImageKit Storage Backend for Django.
    Bypasses S3 and uploads directly to ImageKit.io Media Library.
    """
    
    def __init__(self, **kwargs):
        self.public_key = kwargs.get('public_key', getattr(settings, 'IMAGEKIT_PUBLIC_KEY', ''))
        self.private_key = kwargs.get('private_key', getattr(settings, 'IMAGEKIT_PRIVATE_KEY', ''))
        self.url_endpoint = kwargs.get('url_endpoint', getattr(settings, 'IMAGEKIT_URL_ENDPOINT', ''))
        
        self.imagekit = ImageKit(
            public_key=self.public_key,
            private_key=self.private_key,
            url_endpoint=self.url_endpoint
        )

    def _save(self, name, content):
        """
        Intercepts the Django file save process, Base64 encodes the stream,
        and pushes it directly to the ImageKit API.
        """
        content.seek(0)
        file_bytes = content.read()
        base64_image = base64.b64encode(file_bytes).decode('utf-8')
        
        folder = os.path.dirname(name)
        file_name = os.path.basename(name)
        
        # Uploading via ImageKit SDK v3+
        response = self.imagekit.upload_file(
            file=base64_image,
            file_name=file_name,
            options={
                "folder": f"/agrimarket/{folder}" if folder else "/agrimarket/",
                "use_unique_file_name": True,
            }
        )
        
        if response.error:
            raise Exception(f"ImageKit Upload Failed: {response.error.message}")
            
        # Return the clean path saved in ImageKit so Django saves this exact string to the DB
        saved_path = response.response_metadata.raw.get('filePath', name)
        
        # Strip leading slash to conform to Django's pathing logic
        if saved_path.startswith('/'):
            saved_path = saved_path[1:]
            
        return saved_path

    def delete(self, name):
        """
        To delete a file in ImageKit, we need its specific file_id.
        This engine searches for the file by its path to obtain the file_id,
        then executes a hard delete to save CDN bandwidth.
        """
        if not name:
            return
            
        search_query = f'name="{os.path.basename(name)}"'
        response = self.imagekit.list_files({"searchQuery": search_query})
        
        if not response.error and response.list:
            for f in response.list:
                ik_path = f.file_path.lstrip('/')
                local_path = name.lstrip('/')
                if ik_path == local_path:
                    self.imagekit.delete_file(file_id=f.file_id)
                    break

    def exists(self, name):
        """
        Checks if file exists by querying the ImageKit Media Library.
        """
        search_query = f'name="{os.path.basename(name)}"'
        response = self.imagekit.list_files({"searchQuery": search_query})
        
        if not response.error and response.list:
            for f in response.list:
                if f.file_path.lstrip('/') == name.lstrip('/'):
                    return True
        return False

    def url(self, name):
        """
        Returns the absolute URL for the file via the ImageKit CDN.
        """
        if not name:
            return ""
            
        if name.startswith('http'):
            return name
            
        return self.imagekit.url({
            "path": name,
            "url_endpoint": self.url_endpoint
        })

    def size(self, name):
        return 0
