from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "ContextForge API",
        "version": "1.0.0",
        "features": {
            "markitdown": True,
            "tiktoken_analysis": True,
            "ai_normalization": True,
            "pdf_export": True
        }
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/documents/', include('documents.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
