class XFrameOptionsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Allow embedding for specific pages
        if request.path.startswith("/media/temp/preview_"):
            response["X-Frame-Options"] = "ALLOW-FROM http://localhost:4200" #for more secure instead of 'ALLOWALL' 
        
        return response
    