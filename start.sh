docker stop polyrouter
docker rm polyrouter
docker build -t polyrouter .
docker run -d --name polyrouter -p 20128:20128 --env-file .env -v polyrouter-data:/app/data polyrouter