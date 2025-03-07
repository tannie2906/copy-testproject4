from pathlib import Path
import logging
import certifi
import ssl
import os



# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-^$4i)gr0!$8zr$kmz+@xv11r-e4oee^68+twbzu@xqj1e+(j+&'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []

APPEND_SLASH = False


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'myapp',
    'corsheaders',
    'django_extensions',
    'django_otp',
    'django_otp.plugins.otp_totp',  # Ensure this is included for TOTP devices
    'django_otp.plugins.otp_static',
    #'django_otp.plugins.otp_totp',  # For TOTP-based 2FA
    #'two_factor',
]

MIDDLEWARE = [
    'myapp.middleware.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',  # Ensure this is added
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'testproject.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "myapp/templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'testproject.wsgi.application'

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True

# Allow embedding from localhost:4200
CSP_FRAME_ANCESTORS = ["'self'", "http://localhost:4200"]

CSP_DEFAULT_SRC = ["'self'"]
CSP_STYLE_SRC = ["'self'", "https://fonts.googleapis.com"]
CSP_FONT_SRC = ["'self'", "https://fonts.gstatic.com"]


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

CORS_ALLOWED_ORIGINS = [
    "https://localhost:4200",  # Your Angular app's URL
    "https://127.0.0.1:4200",
]

CSRF_TRUSTED_ORIGINS = [
    "https://localhost:4200",
    "https://127.0.0.1:4200",
]

SECURE_SSL_REDIRECT = True  # Only for local development
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

CORS_ALLOW_CREDENTIALS = True
DEBUG_PROPAGATE_EXCEPTIONS = True


CORS_ALLOW_METHODS = [
    "GET", 
    "POST", 
    "PUT", 
    "DELETE", 
    "OPTIONS",
    "PATCH",
    ]

CORS_ALLOW_HEADERS = [
    'authorization',
    'content-type',
    'accept',
    'origin',
    'x-requested-with',
    'x-csrf-token',
    "x-csrftoken",  
    "enctype",
]

CSRF_COOKIE_HTTPONLY = False  # Ensures the CSRF token is accessible by JavaScript.


ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

ssl._create_default_https_context = ssl._create_unverified_context
ssl.get_default_verify_paths = lambda: ssl.VerifyPaths(cafile=certifi.where())

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587  # TLS
EMAIL_USE_TLS = True
#EMAIL_USE_SSL = True
EMAIL_HOST_USER = 'danyin161@gmail.com'  # Your Gmail address
EMAIL_HOST_PASSWORD = 'ercddvdzzlylzmvn'  # The app-specific password

DEFAULT_FROM_EMAIL = 'danyin161@gmail.com' 

# Debugging settingsx
EMAIL_DEBUG = True

# SSL context to handle CA file
EMAIL_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

# SSL context
context = ssl.create_default_context(cafile=certifi.where())
EMAIL_SSL_CONTEXT = context

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.mail.yahoo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@yahoo.com'
EMAIL_HOST_PASSWORD = 'your-email-password-or-app-password'


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'

# This points Django to the Angular build folder
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'frontend', 'dist', 'frontend'),
]

# This is where Django will collect all static files (e.g., during production with 'collectstatic')
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # Django will collect static files here

MEDIA_URL = '/media/'  # URL prefix for media files
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # Root directory for all media files


# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

# Allow iframe embedding from the same origin
X_FRAME_OPTIONS = "ALLOW-FROM http://localhost:4200"


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGIN_URL = '/login/'  # Or wherever your login page is
LOGIN_REDIRECT_URL = '/'  # Default redirect after login

class IgnoreBrokenPipeFilter(logging.Filter):
    def filter(self, record):
        return not ("Broken pipe" in record.getMessage())

logging.getLogger("django.server").addFilter(IgnoreBrokenPipeFilter())

DEBUG = True

EMAIL_USE_LOCALTIME = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
        'django.utils.autoreload': {
            'handlers': ['console'],
            'level': 'WARNING',  # Suppress verbose file monitoring messages
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
}