from schematics.models import Model
from schematics.types import StringType


class ReferenceType(StringType):

    def __init__(self, serialized_name="$ref", deserialize_from="$ref", **kwargs):

        super(ReferenceType, self).__init__(
            serialized_name=serialized_name,
            deserialize_from=deserialize_from,
            **kwargs
        )


class Reference(Model):
    """A simple object to allow referencing other definitions in the specification. It can be used to reference parameters and responses that are defined at the top level for reuse."""

    ref = ReferenceType(required=True)  # The reference string

    @classmethod
    def _claim_polymorphic(cls, data):
        return isinstance(data, dict) and "$ref" in data