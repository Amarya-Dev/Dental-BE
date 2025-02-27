#!/bin/sh
# wait-for-it.sh

set -e

echo "Host: $1"
echo "Command: $@"
host="$1"
shift
cmd="$@"

until nc -z "$host" 3306; do
  >&2 echo "MySQL is unavailable - sleeping"
  sleep 1
done

>&2 echo "MySQL is up - executing command"
exec $cmd
