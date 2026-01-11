.PHONY: install format lint test ci hooks

install:
	python -m pip install -U pip
	pip install -r requirements.txt -r requirements-dev.txt

format:
	python -m isort src
	python -m black src

lint:
	python -m isort --check-only --diff src
	python -m black --check --diff src
	python -m flake8 src

test:
	python -m pytest

ci: lint test

hooks:
	python -m pre_commit run --config .pre-commit-config.yaml --all-files
