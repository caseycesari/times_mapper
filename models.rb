class Location
    include DataMapper::Resource
    property :id, Serial
    property :name, String
    property :lat, Float
    property :lng, Float
end