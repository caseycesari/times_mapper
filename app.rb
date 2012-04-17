require 'rubygems'
require 'sinatra'
require 'compass'
require 'sass'
require 'haml'
require 'json'
require 'net/http'
require 'date'

get '/' do
  'Hello World!'
end