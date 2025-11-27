# Makefile for TransFront project
# Build the Docker image
build:
	docker build -t transfront .
	docker run --rm -it -p 5173:5173 transfront

# Run the Docker container
run:
	docker run --rm -it -p 5173:5173 transfront

# Remove the Docker image
rm:
	docker rmi transfront

# Show Docker images
images:
	docker images | grep transfront

# Clean up dangling images
clean:
	docker image prune -f

.PHONY: build run rm images clean dev

# Run Vite dev server with auto-reload
dev:
	npm run dev
