NAME=ft_transcendence

all: $(NAME)

$(NAME): up

up:
	@./ssl/generate_ssl.sh
	@docker compose up --build

down:
	@./ssl/delete_ssl.sh
	@docker compose down

clean: down
	@echo "Stopping running containers..."
	@docker ps -q | xargs -r docker stop

	@echo "Removing containers..."
	@docker ps -aq | xargs -r docker rm

	@echo "Removing images..."
	@docker images -q | xargs -r docker rmi -f

	@echo "Removing volumes..."
	@docker volume ls -q | xargs -r docker volume rm

	@echo "Removing networks..."
	@docker network ls --format "table {{.Name}}" | tail -n +2 | grep -vE "^(bridge|host|none)$$" | xargs -r docker network rm

fclean: down clean
	@echo "Pruning..."
	@docker system prune -af

re: clean up

fre: fclean up

.PHONY: all up down clean fclean re fre